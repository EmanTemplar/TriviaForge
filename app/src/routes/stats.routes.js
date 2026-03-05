import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import * as statsController from '../controllers/stats.controller.js';

const router = express.Router();

// GET /api/stats/summary - Overall stats summary
router.get('/summary', requireAuth, asyncHandler(statsController.getSummaryStats));

// GET /api/stats/history - Paginated game history
router.get('/history', requireAuth, asyncHandler(statsController.getGameHistory));

// GET /api/stats/charts - Chart data (accuracy + score over time)
router.get('/charts', requireAuth, asyncHandler(statsController.getChartData));

export default router;
