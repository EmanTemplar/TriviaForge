/**
 * TriviaForge - Quiz Routes
 *
 * All quiz-related endpoints:
 * - CRUD operations for quizzes
 * - Excel import/export
 */

import { Router } from 'express';
import path from 'path';
import multer from 'multer';
import * as quizController from '../controllers/quiz.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
});

/**
 * List all quizzes
 * GET /api/quizzes
 *
 * Returns: Array of quiz objects with basic info
 */
router.get('/', requireAdmin, asyncHandler(quizController.listQuizzes));

/**
 * Get single quiz by ID
 * GET /api/quizzes/:filename
 *
 * Params: filename (format: quiz_123.json or just the ID)
 * Returns: Quiz object with all questions and answers
 */
router.get('/:filename', requireAdmin, asyncHandler(quizController.getQuiz));

/**
 * Create new quiz
 * POST /api/quizzes
 *
 * Body: { title, description, questions }
 * Returns: Created quiz object
 *
 * Note: Uses doubleCsrfProtection middleware (applied in server.js)
 */
router.post('/', requireAdmin, asyncHandler(quizController.createQuiz));

/**
 * Update existing quiz
 * PUT /api/quizzes/:filename
 *
 * Params: filename (format: quiz_123.json or just the ID)
 * Body: { title, description, questions }
 * Returns: Updated quiz object
 *
 * Note: Uses doubleCsrfProtection middleware (applied in server.js)
 */
router.put('/:filename', requireAdmin, asyncHandler(quizController.updateQuiz));

/**
 * Delete quiz (soft delete)
 * DELETE /api/quizzes/:filename
 *
 * Params: filename (format: quiz_123.json or just the ID)
 * Returns: { success: true }
 *
 * Note: Uses doubleCsrfProtection middleware (applied in server.js)
 */
router.delete('/:filename', requireAdmin, asyncHandler(quizController.deleteQuiz));

export default router;

// Separate router for quiz template and import
// These are mounted at different paths than /api/quizzes
export const templateRouter = Router();

/**
 * Download Excel quiz template
 * GET /api/quiz-template
 *
 * Returns: Excel file download
 */
templateRouter.get('/', asyncHandler(quizController.downloadTemplate));

export const importRouter = Router();

/**
 * Import quiz from Excel file
 * POST /api/import-quiz
 *
 * Multipart form data with 'file' field
 * Returns: { success, filename, id, title, questionCount }
 *
 * Note: Uses doubleCsrfProtection middleware (applied in server.js)
 */
importRouter.post(
  '/',
  requireAdmin,
  upload.single('file'),
  asyncHandler(quizController.importQuiz)
);
