/**
 * TriviaForge - Authentication Controller
 *
 * Handles all authentication-related operations:
 * - Admin login
 * - Player login
 * - Guest/Player registration
 * - Password reset
 * - Session management
 */

import bcrypt from 'bcrypt';
import { query } from '../config/database.js';
import { env } from '../config/environment.js';
import { DEFAULTS, USER_ROLES } from '../config/constants.js';
import {
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  PasswordResetRequiredError,
  ConflictError,
} from '../utils/errors.js';
import { sendSuccess } from '../utils/responses.js';
import {
  validateUsername,
  validatePassword,
  throwIfInvalid,
} from '../utils/validators.js';

// Debug logging (controlled by DEBUG_MODE or NODE_ENV)
const DEBUG_ENABLED = process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true';

/**
 * Admin login (uses ADMIN_PASSWORD from environment)
 *
 * POST /api/auth/login
 * Body: { username, password }
 */
export async function adminLogin(req, res, next) {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      throw new BadRequestError('Username and password required');
    }

    // Find user
    const result = await query(
      'SELECT id, username, password_hash, account_type FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const user = result.rows[0];

    // Check if password exists (not a guest account)
    if (!user.password_hash) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Create session token
    const sessionResult = await query(
      `INSERT INTO user_sessions (user_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '${env.sessionTimeout} milliseconds')
       RETURNING token, expires_at`,
      [user.id]
    );

    const session = sessionResult.rows[0];

    res.json({
      token: session.token,
      user: {
        id: user.id,
        username: user.username,
        account_type: user.account_type,
      },
      expires_at: session.expires_at,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Player login (for registered player accounts)
 *
 * POST /api/auth/player-login
 * Body: { username, password }
 */
export async function playerLogin(req, res, next) {
  try {
    const { username, password } = req.body;

    console.log(`[PLAYER LOGIN] Attempting login for user: ${username}`);

    // Validate input
    if (!username || !password) {
      throw new BadRequestError('Username and password required');
    }

    // Find user
    const result = await query(
      'SELECT id, username, password_hash, account_type FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log(`[PLAYER LOGIN] User not found: ${username}`);
      throw new UnauthorizedError('Invalid credentials');
    }

    const user = result.rows[0];

    console.log(
      `[PLAYER LOGIN] User found - ID: ${user.id}, Account Type: ${user.account_type}, Password Hash Null: ${
        user.password_hash === null
      }`
    );

    // Only allow registered players to login
    if (user.account_type !== USER_ROLES.PLAYER) {
      console.log(`[PLAYER LOGIN] Account type not allowed: ${user.account_type}`);
      throw new ForbiddenError('This account cannot login with a password');
    }

    // Check if password needs to be reset (password_hash is NULL)
    if (user.password_hash === null) {
      console.log(`[PLAYER LOGIN] Password reset required for user: ${username}`);
      throw new PasswordResetRequiredError();
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    console.log(`[PLAYER LOGIN] Password match result: ${passwordMatch}`);

    if (!passwordMatch) {
      console.log(`[PLAYER LOGIN] Invalid password for user: ${username}`);
      throw new UnauthorizedError('Invalid credentials');
    }

    // Create session token
    const sessionResult = await query(
      `INSERT INTO user_sessions (user_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '${env.sessionTimeout} milliseconds')
       RETURNING token, expires_at`,
      [user.id]
    );

    const token = sessionResult.rows[0].token;

    // Update last_seen
    await query('UPDATE users SET updated_at = NOW() WHERE id = $1', [user.id]);

    console.log(`[PLAYER LOGIN] ✅ Player ${username} logged in successfully`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        accountType: user.account_type,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Logout (invalidate session)
 *
 * POST /api/auth/logout
 * Headers: Authorization: Bearer <token>
 */
export async function logout(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    await query('DELETE FROM user_sessions WHERE token = $1', [token]);

    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Register player (upgrade guest account to player account)
 *
 * POST /api/auth/register-player
 * Body: { username, password }
 */
export async function registerPlayer(req, res, next) {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      throw new BadRequestError('Username and password required');
    }

    throwIfInvalid(validatePassword(password));

    // Check if username exists as guest
    const result = await query(
      'SELECT id, account_type, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Guest account not found. Please join a game first.');
    }

    const user = result.rows[0];

    // If already a player or admin with a password, return error
    // Allow if: guest account OR password was reset by admin (password_hash is NULL)
    if (user.account_type !== USER_ROLES.GUEST && user.password_hash !== null) {
      throw new ConflictError('This account is already registered');
    }

    // If account already has a password, they're trying to register again
    if (user.password_hash) {
      throw new ConflictError('This account already has a password');
    }

    // Hash password and upgrade to player
    const passwordHash = await bcrypt.hash(password, DEFAULTS.BCRYPT_SALT_ROUNDS);

    await query(
      `UPDATE users
       SET account_type = $1, password_hash = $2
       WHERE id = $3`,
      [USER_ROLES.PLAYER, passwordHash, user.id]
    );

    // Create session token
    const sessionResult = await query(
      `INSERT INTO user_sessions (user_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '${env.sessionTimeout} milliseconds')
       RETURNING token, expires_at`,
      [user.id]
    );

    const session = sessionResult.rows[0];

    console.log(`Guest user "${username}" upgraded to player account`);

    res.json({
      success: true,
      token: session.token,
      user: {
        id: user.id,
        username: username,
        account_type: USER_ROLES.PLAYER,
      },
      expires_at: session.expires_at,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Register guest (same as register player, kept for backward compatibility)
 *
 * POST /api/auth/register-guest
 * Body: { username, password }
 */
export async function registerGuest(req, res, next) {
  // Same logic as registerPlayer
  return registerPlayer(req, res, next);
}

/**
 * Get current authenticated user
 *
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */
export function getCurrentUser(req, res) {
  res.json({
    user: {
      id: req.user.user_id,
      username: req.user.username,
      account_type: req.user.account_type,
    },
  });
}

/**
 * Check if username exists and requires authentication
 *
 * POST /api/auth/check-username
 * Body: { username }
 */
export async function checkUsername(req, res, next) {
  try {
    const { username } = req.body;

    if (DEBUG_ENABLED) {
      console.log('[CHECK-USERNAME] Request received:', {
        username,
        isMobile: /Mobile|Android|iPhone|iPad/i.test(req.headers['user-agent'] || ''),
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin,
        ip: req.ip
      });
    }

    if (!username) {
      if (DEBUG_ENABLED) console.error('[CHECK-USERNAME] No username provided');
      throw new BadRequestError('Username required');
    }

    const result = await query(
      'SELECT id, username, account_type FROM users WHERE username = $1',
      [username]
    );

    if (DEBUG_ENABLED) {
      console.log('[CHECK-USERNAME] Database query result:', {
        username,
        exists: result.rows.length > 0,
        accountType: result.rows[0]?.account_type
      });
    }

    if (result.rows.length === 0) {
      // Username doesn't exist - can be used as new guest
      if (DEBUG_ENABLED) console.log('[CHECK-USERNAME] Username available for new guest:', username);
      return res.json({ exists: false, requiresAuth: false });
    }

    const user = result.rows[0];

    // If account is registered (player type), requires authentication
    if (user.account_type === USER_ROLES.PLAYER) {
      if (DEBUG_ENABLED) console.log('[CHECK-USERNAME] Registered player found, auth required:', username);
      return res.json({
        exists: true,
        requiresAuth: true,
        accountType: USER_ROLES.PLAYER,
      });
    }

    // Guest account - can be used without auth
    if (DEBUG_ENABLED) console.log('[CHECK-USERNAME] Guest account found:', username);
    return res.json({
      exists: true,
      requiresAuth: false,
      accountType: USER_ROLES.GUEST,
    });
  } catch (err) {
    if (DEBUG_ENABLED) console.error('[CHECK-USERNAME] Error:', err);
    next(err);
  }
}

/**
 * Set new password after admin reset
 *
 * POST /api/auth/set-new-password
 * Body: { username, password }
 */
export async function setNewPassword(req, res, next) {
  try {
    const { username, password } = req.body;

    console.log(`[PASSWORD SET] Attempting to set password for user: ${username}`);

    // Validate input
    if (!username || !password) {
      throw new BadRequestError('Username and password required');
    }

    throwIfInvalid(validatePassword(password));

    // Find user
    const result = await query(
      'SELECT id, username, password_hash, account_type FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log(`[PASSWORD SET] User not found: ${username}`);
      throw new NotFoundError('User');
    }

    const user = result.rows[0];

    console.log(
      `[PASSWORD SET] User found - ID: ${user.id}, Account Type: ${user.account_type}, Password Hash Null: ${
        user.password_hash === null
      }`
    );

    // Only allow registered players
    if (user.account_type !== USER_ROLES.PLAYER) {
      console.log(`[PASSWORD SET] Account type not allowed: ${user.account_type}`);
      throw new ForbiddenError('This account cannot set a password');
    }

    // Check if password is in reset state (NULL)
    if (user.password_hash !== null) {
      console.log(`[PASSWORD SET] Password not in reset state for user: ${username}`);
      throw new BadRequestError('Password is not in reset state. Use the login form instead.');
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, DEFAULTS.BCRYPT_SALT_ROUNDS);

    console.log(`[PASSWORD SET] Password hashed successfully for user: ${username}`);

    // Update password in database
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      passwordHash,
      user.id,
    ]);

    console.log(`[PASSWORD SET] Database updated for user: ${username}`);

    // Verify the update worked
    const verifyResult = await query('SELECT password_hash FROM users WHERE id = $1', [user.id]);

    console.log(
      `[PASSWORD SET] Verification - Password hash now null: ${
        verifyResult.rows[0].password_hash === null
      }`
    );

    // Create session token
    const sessionResult = await query(
      `INSERT INTO user_sessions (user_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '${env.sessionTimeout} milliseconds')
       RETURNING token, expires_at`,
      [user.id]
    );

    const token = sessionResult.rows[0].token;

    console.log(`[PASSWORD SET] ✅ Player ${username} set new password after reset successfully`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        accountType: user.account_type,
      },
    });
  } catch (err) {
    console.error('[PASSWORD SET] ❌ Set new password error:', err);
    next(err);
  }
}

/**
 * Verify player token (for auto-login)
 *
 * POST /api/auth/verify-player
 * Headers: Authorization: Bearer <token>
 */
export async function verifyPlayer(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);

    // Check if session exists and is valid
    const result = await query(
      `SELECT s.user_id, s.expires_at, u.username, u.account_type
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    const session = result.rows[0];

    res.json({
      valid: true,
      user: {
        id: session.user_id,
        username: session.username,
        accountType: session.account_type,
      },
      expiresAt: session.expires_at,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create a new admin account (root admin only)
 *
 * POST /api/auth/create-admin
 * Body: { username, password, email? }
 */
export async function createAdmin(req, res, next) {
  try {
    const { username, password, email } = req.body;

    // Validate input
    if (!username || !password) {
      throw new BadRequestError('Username and password required');
    }

    throwIfInvalid(validateUsername(username));
    throwIfInvalid(validatePassword(password));

    // Check if username already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('Username already exists');
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingEmail.rows.length > 0) {
        throw new ConflictError('Email already in use');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, DEFAULTS.BCRYPT_SALT_ROUNDS);

    // Create admin user
    const result = await query(
      `INSERT INTO users (username, password_hash, account_type, email, is_root_admin)
       VALUES ($1, $2, $3, $4, FALSE)
       RETURNING id, username, account_type, email, created_at`,
      [username, passwordHash, USER_ROLES.ADMIN, email || null]
    );

    const newAdmin = result.rows[0];

    console.log(`[CREATE ADMIN] Root admin ${req.user.username} created new admin: ${username}`);

    sendSuccess(res, {
      admin: {
        id: newAdmin.id,
        username: newAdmin.username,
        account_type: newAdmin.account_type,
        email: newAdmin.email,
        created_at: newAdmin.created_at,
      },
    }, 'Admin account created successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Get current authenticated user with admin details
 *
 * GET /api/auth/admin-info
 * Headers: Authorization: Bearer <token>
 */
export async function getAdminInfo(req, res, next) {
  try {
    const result = await query(
      'SELECT id, username, account_type, email, is_root_admin, created_at FROM users WHERE id = $1',
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = result.rows[0];

    res.json({
      user: {
        id: user.id,
        username: user.username,
        account_type: user.account_type,
        email: user.email,
        is_root_admin: user.is_root_admin || false,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * List all admin accounts (root admin only)
 *
 * GET /api/auth/admins
 * Headers: Authorization: Bearer <token>
 */
export async function listAdmins(req, res, next) {
  try {
    const result = await query(
      `SELECT id, username, email, is_root_admin, created_at
       FROM users
       WHERE account_type = $1
       ORDER BY is_root_admin DESC, created_at ASC`,
      [USER_ROLES.ADMIN]
    );

    res.json({
      admins: result.rows.map(admin => ({
        id: admin.id,
        username: admin.username,
        email: admin.email,
        is_root_admin: admin.is_root_admin || false,
        created_at: admin.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Delete an admin account (root admin only, cannot delete self or root admin)
 *
 * DELETE /api/auth/admins/:id
 * Headers: Authorization: Bearer <token>
 */
export async function deleteAdmin(req, res, next) {
  try {
    const adminId = parseInt(req.params.id, 10);

    if (isNaN(adminId)) {
      throw new BadRequestError('Invalid admin ID');
    }

    // Prevent deleting self
    if (adminId === req.user.user_id) {
      throw new ForbiddenError('Cannot delete your own account');
    }

    // Check if target is root admin
    const targetResult = await query(
      'SELECT id, username, is_root_admin FROM users WHERE id = $1 AND account_type = $2',
      [adminId, USER_ROLES.ADMIN]
    );

    if (targetResult.rows.length === 0) {
      throw new NotFoundError('Admin');
    }

    const targetAdmin = targetResult.rows[0];

    if (targetAdmin.is_root_admin) {
      throw new ForbiddenError('Cannot delete the root admin account');
    }

    // Delete admin (this will cascade to their sessions)
    await query('DELETE FROM user_sessions WHERE user_id = $1', [adminId]);
    await query('DELETE FROM users WHERE id = $1', [adminId]);

    console.log(`[DELETE ADMIN] Root admin ${req.user.username} deleted admin: ${targetAdmin.username}`);

    sendSuccess(res, null, 'Admin account deleted successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Update admin's own email address
 *
 * PUT /api/auth/update-email
 * Body: { email }
 */
export async function updateAdminEmail(req, res, next) {
  try {
    const { email } = req.body;
    const adminId = req.user.user_id;

    // Validate email format (basic validation)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestError('Invalid email format');
    }

    // Check if email already in use by another user
    if (email) {
      const existingEmail = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, adminId]
      );

      if (existingEmail.rows.length > 0) {
        throw new ConflictError('Email already in use');
      }
    }

    // Update email
    await query(
      'UPDATE users SET email = $1 WHERE id = $2',
      [email || null, adminId]
    );

    console.log(`[UPDATE EMAIL] Admin ${req.user.username} updated their email to: ${email || '(cleared)'}`);

    sendSuccess(res, { email: email || null }, 'Email updated successfully');
  } catch (err) {
    next(err);
  }
}

// Export all controller functions
export default {
  adminLogin,
  playerLogin,
  logout,
  registerPlayer,
  registerGuest,
  getCurrentUser,
  checkUsername,
  setNewPassword,
  verifyPlayer,
  createAdmin,
  getAdminInfo,
  listAdmins,
  deleteAdmin,
  updateAdminEmail,
};
