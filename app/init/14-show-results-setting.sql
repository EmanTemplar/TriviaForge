-- Migration 14: Add show_results per-quiz setting
-- Controls whether end-of-game results podium is shown to players/displays

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS show_results BOOLEAN DEFAULT TRUE;
