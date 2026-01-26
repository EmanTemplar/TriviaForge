/**
 * TriviaForge - User Controller
 *
 * Handles all user management operations:
 * - List users
 * - Delete user
 * - Downgrade player to guest
 * - Reset user password
 * - Get/Update theme preference
 */

import { query } from '../config/database.js';
import { NotFoundError, BadRequestError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { USER_ROLES } from '../config/constants.js';

// Valid theme values
const VALID_THEMES = ['light', 'dark', 'grey', 'system'];

/**
 * List all users (admin only)
 * GET /api/users
 *
 * Returns: Array of user objects with statistics
 */
export async function listUsers(req, res, next) {
  try {
    const result = await query(`
      SELECT
        u.id,
        u.username,
        u.email,
        u.account_type,
        u.is_root_admin,
        u.created_at,
        COUNT(DISTINCT gp.game_session_id) as games_played,
        GREATEST(
          MAX(gs.created_at),
          MAX(us.last_used_at)
        ) as last_seen
      FROM users u
      LEFT JOIN game_participants gp ON u.id = gp.user_id
      LEFT JOIN game_sessions gs ON gp.game_session_id = gs.id
      LEFT JOIN user_sessions us ON u.id = us.user_id
      WHERE u.account_type IN ('guest', 'player', 'admin')
      GROUP BY u.id, u.username, u.email, u.account_type, u.is_root_admin, u.created_at
      ORDER BY u.account_type DESC, u.is_root_admin DESC NULLS LAST, u.created_at DESC
    `);

    const users = result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email || null,
      accountType: row.account_type,
      isRootAdmin: row.is_root_admin || false,
      createdAt: row.created_at,
      gamesPlayed: parseInt(row.games_played),
      lastSeen: row.last_seen,
    }));

    res.json(users);
  } catch (err) {
    next(err);
  }
}

/**
 * Delete user (admin only)
 * DELETE /api/users/:userId
 *
 * @param {string} req.params.userId - User ID to delete
 */
export async function deleteUser(req, res, next) {
  try {
    const { userId } = req.params;

    // Prevent deleting admin users
    const userCheck = await query('SELECT account_type FROM users WHERE id = $1', [userId]);

    if (userCheck.rows.length === 0) {
      throw new NotFoundError('User');
    }

    if (userCheck.rows[0].account_type === USER_ROLES.ADMIN) {
      throw new ForbiddenError('Cannot delete admin users');
    }

    // Delete user and all associated data (cascading deletes handled by database)
    await query('DELETE FROM users WHERE id = $1', [userId]);

    console.log(`User ${userId} deleted by admin`);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * Downgrade user from player to guest (admin only)
 * POST /api/users/:userId/downgrade
 *
 * @param {string} req.params.userId - User ID to downgrade
 */
export async function downgradeUser(req, res, next) {
  try {
    const { userId } = req.params;

    // Check user exists and is a player
    const userCheck = await query('SELECT account_type FROM users WHERE id = $1', [userId]);

    if (userCheck.rows.length === 0) {
      throw new NotFoundError('User');
    }

    if (userCheck.rows[0].account_type !== USER_ROLES.PLAYER) {
      throw new BadRequestError('User is not a registered player');
    }

    // Downgrade to guest (remove password, change account type)
    await query('UPDATE users SET account_type = $1, password_hash = NULL WHERE id = $2', [
      USER_ROLES.GUEST,
      userId,
    ]);

    // Invalidate all user sessions
    await query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

    console.log(`User ${userId} downgraded to guest by admin`);
    res.json({ success: true, message: 'User downgraded to guest successfully' });
  } catch (err) {
    next(err);
  }
}

/**
 * Reset a user's password (admin only)
 * POST /api/users/:userId/reset-password
 *
 * @param {string} req.params.userId - User ID to reset password for
 */
export async function resetPassword(req, res, next) {
  try {
    const { userId } = req.params;

    // Check user exists and is a registered player
    const userCheck = await query('SELECT username, account_type FROM users WHERE id = $1', [
      userId,
    ]);

    if (userCheck.rows.length === 0) {
      throw new NotFoundError('User');
    }

    if (userCheck.rows[0].account_type !== USER_ROLES.PLAYER) {
      throw new BadRequestError('User is not a registered player');
    }

    const username = userCheck.rows[0].username;

    // Reset password (set to NULL) - user will be prompted to set new password on next login
    await query('UPDATE users SET password_hash = NULL WHERE id = $1', [userId]);

    // Invalidate all user sessions
    await query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

    console.log(`Password reset for user ${username} (ID: ${userId}) by admin`);
    res.json({
      success: true,
      message: 'Password reset successfully. User will be prompted to set a new password on next login.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get current user's theme preference
 * GET /api/user/theme
 *
 * Returns the theme preference for the authenticated user
 */
export async function getTheme(req, res, next) {
  try {
    const userId = req.user.id;

    // Get user's theme preference from database
    const result = await query('SELECT theme FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const theme = result.rows[0].theme || 'dark'; // Default to dark if not set

    res.json({ theme });
  } catch (err) {
    next(err);
  }
}

/**
 * Update current user's theme preference
 * PUT /api/user/theme
 *
 * @param {string} req.body.theme - Theme name (light/dark/grey/system)
 */
export async function updateTheme(req, res, next) {
  try {
    const userId = req.user.id;
    const { theme } = req.body;

    // Validate theme value
    if (!theme) {
      throw new ValidationError('Theme is required');
    }

    if (!VALID_THEMES.includes(theme)) {
      throw new ValidationError(
        `Invalid theme. Must be one of: ${VALID_THEMES.join(', ')}`
      );
    }

    // Update user's theme preference
    await query('UPDATE users SET theme = $1 WHERE id = $2', [theme, userId]);

    console.log(`User ${req.user.username} (ID: ${userId}) updated theme to: ${theme}`);

    res.json({
      success: true,
      theme,
      message: 'Theme preference updated successfully'
    });
  } catch (err) {
    next(err);
  }
}

// Export all controller functions
export default {
  listUsers,
  deleteUser,
  downgradeUser,
  resetPassword,
  getTheme,
  updateTheme,
};
