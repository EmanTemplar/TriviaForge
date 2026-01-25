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

// Configure multer for Excel file uploads
const excelUpload = multer({
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

// Configure multer for image uploads (question media)
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'questions');
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename: timestamp_random.ext
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
      cb(null, filename);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png, gif, webp) are allowed'));
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
 * Upload image for question
 * POST /api/quizzes/upload-image
 *
 * Multipart form data with 'image' field
 * Returns: { success: true, imageUrl: '/uploads/questions/filename.jpg' }
 *
 * Note: This route MUST be before /:filename to avoid matching "upload-image" as a filename
 * Note: Uses doubleCsrfProtection middleware (applied in server.js)
 */
router.post(
  '/upload-image',
  requireAdmin,
  imageUpload.single('image'),
  asyncHandler(quizController.uploadImage)
);

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
  excelUpload.single('file'),
  asyncHandler(quizController.importQuiz)
);
