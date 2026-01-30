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
import * as totpService from '../services/totp.service.js';

// Debug logging (controlled by DEBUG_MODE or NODE_ENV)
const DEBUG_ENABLED = process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true';

/**
 * Admin login (uses ADMIN_PASSWORD from environment)
 *
 * POST /api/auth/login
 * Body: { username, password }
 *
 * If 2FA is enabled, returns { requires2FA: true, tempToken } instead of session token.
 * Use /api/auth/totp/verify with the tempToken to complete login.
 */
export async function adminLogin(req, res, next) {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      throw new BadRequestError('Username and password required');
    }

    // Find user with 2FA fields
    const result = await query(
      'SELECT id, username, password_hash, account_type, totp_enabled, totp_secret FROM users WHERE username = $1',
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

    // Check if 2FA is enabled
    if (user.totp_enabled && user.totp_secret) {
      // Create a temporary token for 2FA verification (expires in 5 minutes)
      const tempSessionResult = await query(
        `INSERT INTO user_sessions (user_id, expires_at)
         VALUES ($1, NOW() + INTERVAL '5 minutes')
         RETURNING token`,
        [user.id]
      );

      const tempToken = tempSessionResult.rows[0].token;

      // Return 2FA required response
      return res.json({
        requires2FA: true,
        tempToken,
        user: {
          id: user.id,
          username: user.username,
        },
      });
    }

    // No 2FA - create full session token
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

/**
 * Change admin's own password
 *
 * PUT /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
export async function changeAdminPassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user.user_id;

    // Validate input
    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current password and new password are required');
    }

    throwIfInvalid(validatePassword(newPassword));

    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [adminId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = result.rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, DEFAULTS.BCRYPT_SALT_ROUNDS);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, adminId]
    );

    console.log(`[CHANGE PASSWORD] Admin ${req.user.username} changed their password`);

    sendSuccess(res, {}, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Reset another admin's password (root admin only)
 *
 * POST /api/auth/admins/:id/reset-password
 * Headers: Authorization: Bearer <token>
 * Returns: { tempPassword }
 */
export async function resetAdminPassword(req, res, next) {
  try {
    const adminId = parseInt(req.params.id, 10);

    if (isNaN(adminId)) {
      throw new BadRequestError('Invalid admin ID');
    }

    // Check target admin exists
    const result = await query(
      'SELECT id, username, is_root_admin FROM users WHERE id = $1 AND account_type = $2',
      [adminId, USER_ROLES.ADMIN]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Admin');
    }

    const targetAdmin = result.rows[0];

    // Cannot reset root admin's password
    if (targetAdmin.is_root_admin) {
      throw new ForbiddenError('Cannot reset root admin password');
    }

    // Generate a temp password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let tempPassword = '';
    tempPassword += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    tempPassword += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    tempPassword += '0123456789'[Math.floor(Math.random() * 10)];
    tempPassword += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    for (let i = 4; i < 12; i++) {
      tempPassword += chars[Math.floor(Math.random() * chars.length)];
    }
    // Shuffle
    tempPassword = tempPassword.split('').sort(() => Math.random() - 0.5).join('');

    // Hash and update password
    const passwordHash = await bcrypt.hash(tempPassword, DEFAULTS.BCRYPT_SALT_ROUNDS);
    await query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, adminId]
    );

    // Invalidate all sessions for this admin
    await query('DELETE FROM user_sessions WHERE user_id = $1', [adminId]);

    console.log(`[RESET ADMIN PASSWORD] Root admin ${req.user.username} reset password for admin: ${targetAdmin.username}`);

    sendSuccess(res, { tempPassword }, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
}

// ============================================
// 2FA TOTP Functions
// ============================================

/**
 * Setup TOTP for the current admin
 * Generates a secret and QR code for authenticator app setup
 *
 * POST /api/auth/totp/setup
 * Headers: Authorization: Bearer <token>
 * Returns: { secret, qrCode, uri }
 */
export async function setupTOTP(req, res, next) {
  try {
    const adminId = req.user.user_id;
    const username = req.user.username;

    // Check if 2FA is already enabled
    const result = await query(
      'SELECT totp_enabled FROM users WHERE id = $1',
      [adminId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    if (result.rows[0].totp_enabled) {
      throw new BadRequestError('2FA is already enabled. Disable it first to set up again.');
    }

    // Generate secret and QR code
    const { secret, uri } = totpService.generateSecret(username);
    const qrCode = await totpService.generateQRCode(uri);

    // Store secret temporarily (not enabled yet until verified)
    await query(
      'UPDATE users SET totp_secret = $1 WHERE id = $2',
      [secret, adminId]
    );

    console.log(`[TOTP SETUP] Admin ${username} initiated 2FA setup`);

    res.json({
      secret,
      qrCode,
      uri,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Enable TOTP for the current admin
 * Verifies the initial code and activates 2FA
 *
 * POST /api/auth/totp/enable
 * Headers: Authorization: Bearer <token>
 * Body: { token }
 * Returns: { success, backupCodes }
 */
export async function enableTOTP(req, res, next) {
  try {
    const { token } = req.body;
    const adminId = req.user.user_id;
    const username = req.user.username;

    if (!token) {
      throw new BadRequestError('Verification code required');
    }

    // Get the stored secret
    const result = await query(
      'SELECT totp_secret, totp_enabled FROM users WHERE id = $1',
      [adminId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = result.rows[0];

    if (!user.totp_secret) {
      throw new BadRequestError('Please set up 2FA first by calling /api/auth/totp/setup');
    }

    if (user.totp_enabled) {
      throw new BadRequestError('2FA is already enabled');
    }

    // Verify the token
    const isValid = totpService.verifyToken(user.totp_secret, token);

    if (!isValid) {
      throw new UnauthorizedError('Invalid verification code. Please try again.');
    }

    // Generate backup codes
    const backupCodes = totpService.generateBackupCodes();
    const hashedBackupCodes = await totpService.hashBackupCodes(backupCodes);

    // Enable 2FA and store backup codes
    await query(
      `UPDATE users
       SET totp_enabled = TRUE, totp_backup_codes = $1, totp_enabled_at = NOW()
       WHERE id = $2`,
      [hashedBackupCodes, adminId]
    );

    console.log(`[TOTP ENABLE] Admin ${username} enabled 2FA successfully`);

    // Return formatted backup codes for display
    const formattedCodes = totpService.formatBackupCodes(backupCodes);

    res.json({
      success: true,
      message: '2FA has been enabled successfully',
      backupCodes: formattedCodes,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Disable TOTP for the current admin
 * Requires password confirmation
 *
 * POST /api/auth/totp/disable
 * Headers: Authorization: Bearer <token>
 * Body: { password }
 * Returns: { success }
 */
export async function disableTOTP(req, res, next) {
  try {
    const { password } = req.body;
    const adminId = req.user.user_id;
    const username = req.user.username;

    if (!password) {
      throw new BadRequestError('Password required to disable 2FA');
    }

    // Verify password
    const result = await query(
      'SELECT password_hash, totp_enabled FROM users WHERE id = $1',
      [adminId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = result.rows[0];

    if (!user.totp_enabled) {
      throw new BadRequestError('2FA is not enabled');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid password');
    }

    // Disable 2FA and clear all TOTP data
    await query(
      `UPDATE users
       SET totp_enabled = FALSE, totp_secret = NULL, totp_backup_codes = NULL, totp_enabled_at = NULL
       WHERE id = $1`,
      [adminId]
    );

    console.log(`[TOTP DISABLE] Admin ${username} disabled 2FA`);

    sendSuccess(res, null, '2FA has been disabled successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * Verify TOTP code to complete login
 * Call this after adminLogin returns requires2FA: true
 *
 * POST /api/auth/totp/verify
 * Body: { tempToken, code, isBackupCode? }
 * Returns: { token, user, expires_at }
 */
export async function verifyTOTP(req, res, next) {
  try {
    const { tempToken, code, isBackupCode } = req.body;

    if (!tempToken || !code) {
      throw new BadRequestError('Temporary token and verification code required');
    }

    // Verify temp token is valid
    const sessionResult = await query(
      `SELECT s.user_id, u.username, u.account_type, u.totp_secret, u.totp_backup_codes
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [tempToken]
    );

    if (sessionResult.rows.length === 0) {
      throw new UnauthorizedError('Invalid or expired token. Please login again.');
    }

    const session = sessionResult.rows[0];

    let verified = false;
    let backupCodeIndex = -1;

    if (isBackupCode) {
      // Verify backup code
      if (!session.totp_backup_codes || session.totp_backup_codes.length === 0) {
        throw new BadRequestError('No backup codes available');
      }

      backupCodeIndex = await totpService.verifyBackupCode(code, session.totp_backup_codes);
      verified = backupCodeIndex !== -1;

      if (verified) {
        // Remove used backup code
        const updatedCodes = [...session.totp_backup_codes];
        updatedCodes.splice(backupCodeIndex, 1);

        await query(
          'UPDATE users SET totp_backup_codes = $1 WHERE id = $2',
          [updatedCodes.length > 0 ? updatedCodes : null, session.user_id]
        );

        console.log(`[TOTP VERIFY] Admin ${session.username} used backup code (${updatedCodes.length} remaining)`);
      }
    } else {
      // Verify TOTP code
      verified = totpService.verifyToken(session.totp_secret, code);
    }

    if (!verified) {
      throw new UnauthorizedError('Invalid verification code');
    }

    // Delete the temp session
    await query('DELETE FROM user_sessions WHERE token = $1', [tempToken]);

    // Create a full session
    const newSessionResult = await query(
      `INSERT INTO user_sessions (user_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '${env.sessionTimeout} milliseconds')
       RETURNING token, expires_at`,
      [session.user_id]
    );

    const newSession = newSessionResult.rows[0];

    console.log(`[TOTP VERIFY] Admin ${session.username} completed 2FA login`);

    res.json({
      token: newSession.token,
      user: {
        id: session.user_id,
        username: session.username,
        account_type: session.account_type,
      },
      expires_at: newSession.expires_at,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Regenerate backup codes for the current admin
 * Requires password confirmation
 *
 * POST /api/auth/totp/backup-codes
 * Headers: Authorization: Bearer <token>
 * Body: { password }
 * Returns: { backupCodes }
 */
export async function regenerateBackupCodes(req, res, next) {
  try {
    const { password } = req.body;
    const adminId = req.user.user_id;
    const username = req.user.username;

    if (!password) {
      throw new BadRequestError('Password required to regenerate backup codes');
    }

    // Verify password and check 2FA is enabled
    const result = await query(
      'SELECT password_hash, totp_enabled FROM users WHERE id = $1',
      [adminId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = result.rows[0];

    if (!user.totp_enabled) {
      throw new BadRequestError('2FA is not enabled');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid password');
    }

    // Generate new backup codes
    const backupCodes = totpService.generateBackupCodes();
    const hashedBackupCodes = await totpService.hashBackupCodes(backupCodes);

    // Store new backup codes
    await query(
      'UPDATE users SET totp_backup_codes = $1 WHERE id = $2',
      [hashedBackupCodes, adminId]
    );

    console.log(`[TOTP BACKUP] Admin ${username} regenerated backup codes`);

    // Return formatted backup codes
    const formattedCodes = totpService.formatBackupCodes(backupCodes);

    res.json({
      success: true,
      message: 'Backup codes regenerated successfully',
      backupCodes: formattedCodes,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get 2FA status for the current admin
 *
 * GET /api/auth/totp/status
 * Headers: Authorization: Bearer <token>
 * Returns: { enabled, enabledAt, backupCodesRemaining }
 */
export async function getTOTPStatus(req, res, next) {
  try {
    const adminId = req.user.user_id;

    const result = await query(
      'SELECT totp_enabled, totp_enabled_at, totp_backup_codes FROM users WHERE id = $1',
      [adminId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User');
    }

    const user = result.rows[0];

    res.json({
      enabled: user.totp_enabled || false,
      enabledAt: user.totp_enabled_at || null,
      backupCodesRemaining: user.totp_backup_codes ? user.totp_backup_codes.length : 0,
    });
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
  changeAdminPassword,
  resetAdminPassword,
  // TOTP 2FA functions
  setupTOTP,
  enableTOTP,
  disableTOTP,
  verifyTOTP,
  regenerateBackupCodes,
  getTOTPStatus,
};
