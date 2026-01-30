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
 * Bulk delete sessions
 * POST /api/sessions/bulk-delete
 *
 * Body: { sessionIds: [1, 2, 3] }
 * Returns: { success: true, deletedCount: N, deletedIds: [...] }
 *
 * Note: Uses POST instead of DELETE to allow body with array of IDs
 */
router.post('/bulk-delete', requireAdmin, asyncHandler(sessionController.bulkDeleteSessions));

/**
 * Export session as CSV
 * GET /api/sessions/:filename/export/csv
 *
 * Returns: CSV file download
 */
router.get('/:filename/export/csv', requireAdmin, asyncHandler(sessionController.exportCSV));

/**
 * Export session as PDF/Report
 * GET /api/sessions/:filename/export/pdf
 *
 * Returns: Text report file download (PDF in future)
 */
router.get('/:filename/export/pdf', requireAdmin, asyncHandler(sessionController.exportPDF));

/**
 * Bulk export sessions as CSV (returns ZIP)
 * POST /api/sessions/export/bulk/csv
 *
 * Body: { sessionIds: [1, 2, 3] }
 * Returns: ZIP file containing multiple CSV files
 */
router.post('/export/bulk/csv', requireAdmin, asyncHandler(sessionController.exportBulkCSV));

/**
 * Bulk export sessions as PDF/Report
 * POST /api/sessions/export/bulk/pdf
 *
 * Body: { sessionIds: [1, 2, 3] }
 * Returns: Combined text report file
 */
router.post('/export/bulk/pdf', requireAdmin, asyncHandler(sessionController.exportBulkPDF));

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
