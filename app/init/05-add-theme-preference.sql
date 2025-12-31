-- Migration 05: Add theme preference to users table
-- Adds theme column to support Light/Dark/Grey/System theme options
-- Default: dark theme for all users

-- Add theme column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'dark';

-- Add constraint to ensure valid theme values
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_theme_check;

ALTER TABLE users
ADD CONSTRAINT users_theme_check
CHECK (theme IN ('light', 'dark', 'grey', 'system'));

-- Add index for faster theme lookups
CREATE INDEX IF NOT EXISTS idx_users_theme ON users(theme);

-- Update existing users to have dark theme (default)
UPDATE users
SET theme = 'dark'
WHERE theme IS NULL;

-- Add comment
COMMENT ON COLUMN users.theme IS 'User theme preference: light, dark, grey, or system';
