/**
 * TriviaForge - Question Bank Routes
 *
 * All question bank-related endpoints:
 * - List questions with pagination and filtering
 * - Get question details
 * - Update question
 * - Manage question tags
 * - Archive/restore and delete questions
 * - Bulk operations
 * - Create quiz from selection
 */

import { Router } from 'express';
import * as questionBankController from '../controllers/questionBank.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// ============================================================================
// QUESTION LISTING & DETAILS
// ============================================================================

/**
 * List all questions with pagination, filtering, and sorting
 * GET /api/questions/bank
 *
 * Query params:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 25, max: 100)
 *   - search: Search in question text
 *   - type: Filter by question type (comma-separated)
 *   - tags: Filter by tag IDs (comma-separated)
 *   - hasImage: Filter by image presence (true/false)
 *   - archived: Include archived questions (default: false)
 *   - sortBy: Sort field (created_at, question_text, usage_count)
 *   - sortOrder: Sort direction (asc/desc)
 *   - createdBy: Filter by creator user ID
 *
 * Returns: { questions: [...], pagination: {...} }
 */
router.get('/bank', requireAdmin, asyncHandler(questionBankController.listQuestions));

/**
 * Get full details for a single question
 * GET /api/questions/:id/details
 *
 * Returns: Question with answers, tags, and quiz usage
 */
router.get('/:id/details', requireAdmin, asyncHandler(questionBankController.getQuestionDetails));

// ============================================================================
// QUESTION UPDATES
// ============================================================================

/**
 * Update a question's text, type, and/or answers
 * PUT /api/questions/:id
 *
 * Body: { question_text?, question_type?, answers? }
 *
 * Returns: Updated question object
 */
router.put('/:id', requireAdmin, asyncHandler(questionBankController.updateQuestion));

/**
 * Update tags for a question
 * PUT /api/questions/:id/tags
 *
 * Body: { tagIds: number[] }
 *
 * Returns: { questionId, tags: [...] }
 */
router.put('/:id/tags', requireAdmin, asyncHandler(questionBankController.updateQuestionTags));

// ============================================================================
// ARCHIVE & DELETE
// ============================================================================

/**
 * Archive a question (soft delete)
 * PUT /api/questions/:id/archive
 *
 * Returns: { success: true, message, questionId }
 */
router.put('/:id/archive', requireAdmin, asyncHandler(questionBankController.archiveQuestion));

/**
 * Restore an archived question
 * PUT /api/questions/:id/restore
 *
 * Returns: { success: true, message, questionId }
 */
router.put('/:id/restore', requireAdmin, asyncHandler(questionBankController.restoreQuestion));

/**
 * Hard delete a question permanently
 * DELETE /api/questions/:id
 *
 * Query params:
 *   - confirm: Must be 'true' to proceed if question is in use
 *
 * Returns (if confirmation needed): { requiresConfirmation: true, usage: {...} }
 * Returns (after deletion): { success: true, message, affectedQuizzes, affectedSessions }
 */
router.delete('/:id', requireAdmin, asyncHandler(questionBankController.deleteQuestion));

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk apply tags to multiple questions
 * POST /api/questions/bulk-tag
 *
 * Body: { questionIds: number[], tagIds: number[], mode?: 'add' | 'replace' }
 *
 * Returns: { success: true, questionCount, tagCount }
 */
router.post('/bulk-tag', requireAdmin, asyncHandler(questionBankController.bulkTagQuestions));

/**
 * Bulk archive multiple questions
 * POST /api/questions/bulk-archive
 *
 * Body: { questionIds: number[] }
 *
 * Returns: { success: true, archivedCount, archivedIds }
 */
router.post('/bulk-archive', requireAdmin, asyncHandler(questionBankController.bulkArchiveQuestions));

/**
 * Bulk delete multiple questions permanently
 * POST /api/questions/bulk-delete
 *
 * Note: Uses POST instead of DELETE to allow body with array
 *
 * Body: { questionIds: number[], confirm?: boolean }
 *
 * Returns (if confirmation needed): { requiresConfirmation: true, usage: {...} }
 * Returns (after deletion): { success: true, deletedCount, deletedIds }
 */
router.post('/bulk-delete', requireAdmin, asyncHandler(questionBankController.bulkDeleteQuestions));

// ============================================================================
// QUIZ GENERATION
// ============================================================================

/**
 * Create a new quiz from selected questions
 * POST /api/quizzes/from-selection
 *
 * Body: {
 *   title: string,
 *   description?: string,
 *   questionIds: number[],
 *   answerDisplayTimeout?: number
 * }
 *
 * Returns: { success: true, quiz: {...} }
 *
 * Note: This endpoint is also mounted at /api/quizzes/from-selection
 */
router.post('/from-quiz-selection', requireAdmin, asyncHandler(questionBankController.createQuizFromSelection));

export default router;
