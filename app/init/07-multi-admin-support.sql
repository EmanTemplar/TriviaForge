-- Migration 07: Multi-admin support
-- Created: 2026-01-25
-- Description: Adds support for multiple admin accounts with isolated quiz/session management

-- Add is_root_admin flag to identify the root administrator
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_root_admin BOOLEAN DEFAULT FALSE;

-- Mark existing admin (user ID 1) as root admin
UPDATE users SET is_root_admin = TRUE WHERE id = 1;

-- Add created_by to game_sessions to track which admin started each session
ALTER TABLE game_sessions
ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id);

-- Update existing sessions to be owned by root admin
UPDATE game_sessions SET created_by = 1 WHERE created_by IS NULL;

-- Create index for session filtering by admin
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_by ON game_sessions(created_by);

-- Add email field to users table for future security features (optional for admins)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create unique partial index for email (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL;
