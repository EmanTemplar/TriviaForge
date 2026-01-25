/**
 * TriviaForge - Authentication Routes
 *
 * All authentication-related endpoints:
 * - Admin login
 * - Player login/registration
 * - Session management
 * - Password reset
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth, requireAdmin, requireRootAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * Admin login
 * POST /api/auth/login
 *
 * Body: { username, password }
 * Returns: { token, user, expires_at }
 */
router.post('/login', asyncHandler(authController.adminLogin));

/**
 * Player login (for registered player accounts)
 * POST /api/auth/player-login
 *
 * Body: { username, password }
 * Returns: { success, token, user }
 *
 * Note: Uses authLimiter and doubleCsrfProtection middleware (applied in server.js)
 */
router.post('/player-login', asyncHandler(authController.playerLogin));

/**
 * Logout (invalidate current session)
 * POST /api/auth/logout
 *
 * Headers: Authorization: Bearer <token>
 * Returns: { success }
 */
router.post('/logout', requireAuth, asyncHandler(authController.logout));

/**
 * Register player (upgrade guest account to player)
 * POST /api/auth/register-player
 *
 * Body: { username, password }
 * Returns: { success, token, user, expires_at }
 *
 * Note: Uses registrationLimiter and doubleCsrfProtection middleware (applied in server.js)
 */
router.post('/register-player', asyncHandler(authController.registerPlayer));

/**
 * Register guest (alias for register-player, backward compatibility)
 * POST /api/auth/register-guest
 *
 * Body: { username, password }
 * Returns: { success, token, user, expires_at }
 */
router.post('/register-guest', asyncHandler(authController.registerGuest));

/**
 * Get current authenticated user
 * GET /api/auth/me
 *
 * Headers: Authorization: Bearer <token>
 * Returns: { user }
 */
router.get('/me', requireAuth, authController.getCurrentUser);

/**
 * Check if username exists and requires authentication
 * POST /api/auth/check-username
 *
 * Body: { username }
 * Returns: { exists, requiresAuth, accountType }
 */
router.post('/check-username', asyncHandler(authController.checkUsername));

/**
 * Set new password after admin reset
 * POST /api/auth/set-new-password
 *
 * Body: { username, password }
 * Returns: { success, token, user }
 */
router.post('/set-new-password', asyncHandler(authController.setNewPassword));

/**
 * Verify player token (for auto-login)
 * POST /api/auth/verify-player
 *
 * Headers: Authorization: Bearer <token>
 * Returns: { valid, user, expiresAt }
 */
router.post('/verify-player', asyncHandler(authController.verifyPlayer));

/**
 * Get admin info (includes is_root_admin flag)
 * GET /api/auth/admin-info
 *
 * Headers: Authorization: Bearer <token>
 * Returns: { user }
 */
router.get('/admin-info', requireAdmin, asyncHandler(authController.getAdminInfo));

/**
 * List all admin accounts (root admin only)
 * GET /api/auth/admins
 *
 * Headers: Authorization: Bearer <token>
 * Returns: { admins }
 */
router.get('/admins', requireRootAdmin, asyncHandler(authController.listAdmins));

/**
 * Create a new admin account (root admin only)
 * POST /api/auth/create-admin
 *
 * Headers: Authorization: Bearer <token>
 * Body: { username, password, email? }
 * Returns: { admin }
 */
router.post('/create-admin', requireRootAdmin, asyncHandler(authController.createAdmin));

/**
 * Delete an admin account (root admin only)
 * DELETE /api/auth/admins/:id
 *
 * Headers: Authorization: Bearer <token>
 * Returns: { success }
 */
router.delete('/admins/:id', requireRootAdmin, asyncHandler(authController.deleteAdmin));

export default router;
