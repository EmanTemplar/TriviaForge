-- Migration 08: TOTP Two-Factor Authentication Support
-- Created: 2026-01-29
-- Description: Adds TOTP 2FA fields to users table for enhanced admin security

-- Add TOTP secret for authenticator app
ALTER TABLE users
ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(128);

-- Add flag to indicate if 2FA is enabled
ALTER TABLE users
ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT FALSE;

-- Add backup codes (stored as hashed JSON array)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS totp_backup_codes TEXT[];

-- Add timestamp for when 2FA was enabled
ALTER TABLE users
ADD COLUMN IF NOT EXISTS totp_enabled_at TIMESTAMP WITH TIME ZONE;

-- Create index for 2FA-enabled users (useful for security queries)
CREATE INDEX IF NOT EXISTS idx_users_totp_enabled ON users(totp_enabled) WHERE totp_enabled = TRUE;
