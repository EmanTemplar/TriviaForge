-- Migration 17: Clean up ghost Display/Spectator users
-- Display connections were incorrectly creating guest user records in the users table.
-- These users have no game_participants rows and serve no purpose.

-- Delete ghost users created by Display connections
-- Match patterns: 'Display-XXXX' usernames (random IDs) and legacy 'Display' exact match
DELETE FROM users
WHERE account_type = 'guest'
  AND (username LIKE 'Display-%' OR username = 'Display')
  AND id NOT IN (SELECT DISTINCT user_id FROM game_participants WHERE user_id IS NOT NULL);
