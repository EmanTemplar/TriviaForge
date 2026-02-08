/**
 * TriviaForge - Solo Play Routes
 * Version: v5.5.0
 *
 * Public endpoints for solo play mode (no authentication required).
 * All endpoints are prefixed with /api/solo
 *
 * Rate limiting applied to prevent abuse:
 * - Session creation: 10 per 15 minutes per IP
 * - Answer submission: 60 per minute per IP (allows rapid play)
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  listSoloQuizzes,
  getSoloQuiz,
  createSoloSession,
  submitSoloAnswer,
  completeSoloSession,
  getSoloResults
} from '../controllers/solo.controller.js';

const router = express.Router();

// Rate limiter for solo session creation (prevent spam)
const soloSessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 sessions per 15 minutes per IP
  message: {
    success: false,
    error: 'Too many solo sessions created. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development/debug mode
  skip: () => process.env.DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development'
});

// Rate limiter for answer submissions (more permissive for gameplay)
const soloAnswerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 answers per minute (1 per second average, with burst allowance)
  message: {
    success: false,
    error: 'Too many answer submissions. Please slow down.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development'
});

// Rate limiter for quiz listing (prevent scraping)
const soloQuizListLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.DEBUG_MODE === 'true' || process.env.NODE_ENV === 'development'
});

// GET /api/solo/quizzes - List all solo-enabled quizzes
router.get('/quizzes', soloQuizListLimiter, listSoloQuizzes);

// GET /api/solo/quizzes/:id - Get a specific quiz for play (no correct answers)
router.get('/quizzes/:id', soloQuizListLimiter, getSoloQuiz);

// POST /api/solo/sessions - Create a new solo session
router.post('/sessions', soloSessionLimiter, createSoloSession);

// POST /api/solo/sessions/:id/answer - Submit an answer
router.post('/sessions/:id/answer', soloAnswerLimiter, submitSoloAnswer);

// POST /api/solo/sessions/:id/complete - Complete the session
router.post('/sessions/:id/complete', soloAnswerLimiter, completeSoloSession);

// GET /api/solo/sessions/:id/results - Get session results
router.get('/sessions/:id/results', getSoloResults);

export default router;
