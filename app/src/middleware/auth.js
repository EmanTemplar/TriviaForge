/**
 * TriviaForge - Authentication Middleware
 *
 * Middleware functions for authentication and authorization.
 * Validates JWT tokens and enforces role-based access control.
 */

import { query } from '../config/database.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { USER_ROLES } from '../config/constants.js';

/**
 * Require authentication middleware
 * Validates session token and attaches user to request object
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 *
 * @example
 * app.get('/api/protected', requireAuth, (req, res) => {
 *   res.json({ user: req.user });
 * });
 */
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return next(new UnauthorizedError('Authentication required'));
  }

  try {
    const result = await query(
      `SELECT us.token, us.user_id, u.username, u.account_type
       FROM user_sessions us
       JOIN users u ON us.user_id = u.id
       WHERE us.token = $1 AND us.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return next(new UnauthorizedError('Invalid or expired session'));
    }

    // Update last_used_at timestamp
    await query(
      'UPDATE user_sessions SET last_used_at = NOW() WHERE token = $1',
      [token]
    );

    // Attach user to request object
    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('[AUTH] Authentication middleware error:', err);
    return next(new UnauthorizedError('Authentication failed'));
  }
}

/**
 * Require admin role middleware
 * Ensures authenticated user has admin role
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 *
 * @example
 * app.delete('/api/users/:id', requireAdmin, (req, res) => {
 *   // Only admins can access this
 * });
 */
export async function requireAdmin(req, res, next) {
  // First check authentication
  await requireAuth(req, res, (err) => {
    // If authentication failed, pass error to error handler
    if (err) {
      return next(err);
    }

    // req.user should be set by requireAuth, but check just in case
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Then check admin role
    if (req.user.account_type !== USER_ROLES.ADMIN) {
      return next(new ForbiddenError('Admin access required'));
    }

    next();
  });
}

/**
 * Require root admin middleware
 * Ensures authenticated user is the root administrator
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 *
 * @example
 * app.post('/api/auth/create-admin', requireRootAdmin, (req, res) => {
 *   // Only root admin can access this
 * });
 */
export async function requireRootAdmin(req, res, next) {
  // First check admin authentication
  await requireAdmin(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    try {
      // Check if this admin is the root admin
      const result = await query(
        'SELECT is_root_admin FROM users WHERE id = $1',
        [req.user.user_id]
      );

      if (result.rows.length === 0 || !result.rows[0].is_root_admin) {
        return next(new ForbiddenError('Root admin access required'));
      }

      // Attach root admin flag to user object
      req.user.is_root_admin = true;
      next();
    } catch (err) {
      console.error('[AUTH] Root admin check failed:', err);
      return next(new ForbiddenError('Authorization check failed'));
    }
  });
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 *
 * @example
 * app.get('/api/quizzes', optionalAuth, (req, res) => {
 *   // req.user will be set if authenticated, otherwise undefined
 * });
 */
export async function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return next(); // No token, continue without user
  }

  try {
    const result = await query(
      `SELECT us.token, us.user_id, u.username, u.account_type
       FROM user_sessions us
       JOIN users u ON us.user_id = u.id
       WHERE us.token = $1 AND us.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    }

    next();
  } catch (err) {
    // Silently fail for optional auth
    console.warn('[AUTH] Optional authentication failed:', err);
    next();
  }
}

/**
 * Check if user has specific role
 * Helper function for role-based access control
 *
 * @param {Object} user - User object from req.user
 * @param {string} role - Required role
 * @returns {boolean}
 */
export function hasRole(user, role) {
  if (!user || !user.account_type) {
    return false;
  }
  return user.account_type === role;
}

/**
 * Check if user is admin
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isAdmin(user) {
  return hasRole(user, USER_ROLES.ADMIN);
}

/**
 * Check if user is player
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isPlayer(user) {
  return hasRole(user, USER_ROLES.PLAYER);
}

/**
 * Check if user is guest
 * @param {Object} user - User object
 * @returns {boolean}
 */
export function isGuest(user) {
  return hasRole(user, USER_ROLES.GUEST);
}

// Export all functions
export default {
  requireAuth,
  requireAdmin,
  requireRootAdmin,
  optionalAuth,
  hasRole,
  isAdmin,
  isPlayer,
  isGuest,
};
