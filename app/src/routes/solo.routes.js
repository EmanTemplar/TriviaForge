/**
 * TriviaForge - Solo Play Routes
 * Version: v5.4.0
 *
 * Public endpoints for solo play mode (no authentication required).
 * All endpoints are prefixed with /api/solo
 */

import express from 'express';
import {
  listSoloQuizzes,
  getSoloQuiz,
  createSoloSession,
  submitSoloAnswer,
  completeSoloSession,
  getSoloResults
} from '../controllers/solo.controller.js';

const router = express.Router();

// GET /api/solo/quizzes - List all solo-enabled quizzes
router.get('/quizzes', listSoloQuizzes);

// GET /api/solo/quizzes/:id - Get a specific quiz for play (no correct answers)
router.get('/quizzes/:id', getSoloQuiz);

// POST /api/solo/sessions - Create a new solo session
router.post('/sessions', createSoloSession);

// POST /api/solo/sessions/:id/answer - Submit an answer
router.post('/sessions/:id/answer', submitSoloAnswer);

// POST /api/solo/sessions/:id/complete - Complete the session
router.post('/sessions/:id/complete', completeSoloSession);

// GET /api/solo/sessions/:id/results - Get session results
router.get('/sessions/:id/results', getSoloResults);

export default router;
