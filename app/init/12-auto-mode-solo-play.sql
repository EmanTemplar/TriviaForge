-- ============================================================================
-- Migration 12: Auto-mode timer settings and solo play support
-- Version: v5.4.0
-- ============================================================================

-- 1. Add timer settings to quizzes table (per-quiz configuration)
-- NULL = use global default from app_settings
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS question_timer INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reveal_delay INT DEFAULT NULL;

-- 2. Add quiz availability flags for live games vs solo play
-- Both default TRUE so existing quizzes remain available everywhere
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS available_live BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS available_solo BOOLEAN DEFAULT TRUE;

-- 3. Add session_type to game_sessions to distinguish multiplayer from solo
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS session_type VARCHAR(20) DEFAULT 'multiplayer';

-- Add CHECK constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_sessions_session_type_check'
  ) THEN
    ALTER TABLE game_sessions
    ADD CONSTRAINT game_sessions_session_type_check
    CHECK (session_type IN ('multiplayer', 'solo'));
  END IF;
END $$;

-- 4. Add global default timer settings to app_settings
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES
  ('default_question_timer', '30', 'Default question timer in seconds for auto-mode (10-120)'),
  ('default_reveal_delay', '5', 'Default delay between answer reveal and next question in seconds (2-30)')
ON CONFLICT (setting_key) DO NOTHING;

-- 5. Allow guest participants (user_id = NULL) for solo play
-- Drop the NOT NULL constraint on user_id
ALTER TABLE game_participants
ALTER COLUMN user_id DROP NOT NULL;

-- Drop the existing unique constraint on (user_id, game_session_id)
-- since user_id can now be NULL for guests
ALTER TABLE game_participants
DROP CONSTRAINT IF EXISTS game_participants_user_id_game_session_id_key;

-- Create a partial unique index for authenticated users only
-- This prevents the same user from joining the same session twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_participants_user_session_unique
ON game_participants (user_id, game_session_id)
WHERE user_id IS NOT NULL;

-- 6. Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_game_sessions_session_type ON game_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_quizzes_available_solo ON quizzes(available_solo) WHERE available_solo = TRUE;
CREATE INDEX IF NOT EXISTS idx_quizzes_available_live ON quizzes(available_live) WHERE available_live = TRUE;
