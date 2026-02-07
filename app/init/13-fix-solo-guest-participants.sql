-- ============================================================================
-- Migration 13: Fix game_participants for solo play guest users
-- Version: v5.4.1
--
-- This fixes the NOT NULL constraint on user_id that prevents guest players
-- from playing solo mode. This migration should have been in migration 12,
-- but was added after it had already been applied to some databases.
-- ============================================================================

-- Allow guest participants (user_id = NULL) for solo play
-- Drop the NOT NULL constraint on user_id
ALTER TABLE game_participants
ALTER COLUMN user_id DROP NOT NULL;

-- Drop the existing unique constraint on (user_id, game_session_id)
-- since user_id can now be NULL for guests
ALTER TABLE game_participants
DROP CONSTRAINT IF EXISTS game_participants_user_id_game_session_id_key;

-- Create a partial unique index for authenticated users only
-- This prevents the same user from joining the same session twice
-- while allowing unlimited guest participants
CREATE UNIQUE INDEX IF NOT EXISTS idx_game_participants_user_session_unique
ON game_participants (user_id, game_session_id)
WHERE user_id IS NOT NULL;
