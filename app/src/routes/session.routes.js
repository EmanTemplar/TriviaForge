/**
 * TriviaForge - Session Routes
 *
 * All session-related endpoints:
 * - List sessions (all, completed, incomplete)
 * - Get session details
 * - Delete session
 */

import { Router } from 'express';
import * as sessionController from '../controllers/session.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

/**
 * List all sessions
 * GET /api/sessions
 *
 * Returns: Array of session objects with basic info
 */
router.get('/', requireAdmin, asyncHandler(sessionController.listSessions));

/**
 * List incomplete sessions only
 * GET /api/sessions/incomplete
 *
 * Returns: Array of incomplete session objects
 */
router.get('/incomplete', requireAdmin, asyncHandler(sessionController.listIncompleteSessions));

/**
 * List completed sessions only
 * GET /api/sessions/completed
 *
 * Returns: Array of completed session objects
 */
router.get('/completed', requireAdmin, asyncHandler(sessionController.listCompletedSessions));

/**
 * Get single session by ID
 * GET /api/sessions/:filename
 *
 * Params: filename (format: session_123.json or just the ID)
 * Returns: Session object with all questions, players, and answers
 */
router.get('/:filename', requireAdmin, asyncHandler(sessionController.getSession));

/**
 * Delete session (cascade delete)
 * DELETE /api/sessions/:filename
 *
 * Params: filename (format: session_123.json or just the ID)
 * Returns: { success: true }
 *
 * Note: Uses doubleCsrfProtection middleware (applied in server.js)
 */
router.delete('/:filename', requireAdmin, asyncHandler(sessionController.deleteSession));

export default router;
