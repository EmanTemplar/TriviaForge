/**
 * TriviaForge - User Routes
 *
 * All user management endpoints (admin only):
 * - List users
 * - Delete user
 * - Downgrade player to guest
 * - Reset user password
 */

import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * List all users (excluding admins)
 * GET /api/users
 *
 * Returns: Array of user objects with statistics (games played, last seen)
 */
router.get('/', requireAdmin, asyncHandler(userController.listUsers));

/**
 * Delete user
 * DELETE /api/users/:userId
 *
 * Params: userId - User ID to delete
 * Returns: { success: true, message }
 *
 * Note: Uses doubleCsrfProtection middleware (applied in server.js)
 * Note: Cannot delete admin users
 */
router.delete('/:userId', requireAdmin, asyncHandler(userController.deleteUser));

/**
 * Downgrade player to guest
 * POST /api/users/:userId/downgrade
 *
 * Params: userId - User ID to downgrade
 * Returns: { success: true, message }
 *
 * Note: Uses doubleCsrfProtection middleware (applied in server.js)
 * Note: Removes password and invalidates all sessions
 */
router.post('/:userId/downgrade', requireAdmin, asyncHandler(userController.downgradeUser));

/**
 * Reset user password
 * POST /api/users/:userId/reset-password
 *
 * Params: userId - User ID to reset password for
 * Returns: { success: true, message }
 *
 * Note: Uses doubleCsrfProtection middleware (applied in server.js)
 * Note: Sets password to NULL, user will be prompted to create new password
 */
router.post('/:userId/reset-password', requireAdmin, asyncHandler(userController.resetPassword));

export default router;
