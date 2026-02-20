-- Migration 15: Server URL setting for QR codes
-- Allows admins to configure the server URL from the Admin UI
-- Empty value = auto-detect from IP (existing behavior)

INSERT INTO app_settings (setting_key, setting_value, description)
VALUES ('server_url', '', 'Server URL for QR codes (leave empty to auto-detect from IP)')
ON CONFLICT (setting_key) DO NOTHING;
