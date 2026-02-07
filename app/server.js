import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import QRCode from 'qrcode';
import os from 'os';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { doubleCsrf } from 'csrf-csrf';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import pkg from 'pg';
const { Pool } = pkg;
import { initializeDatabase } from './db-init.js';

// Import new modular architecture
import authRoutes from './src/routes/auth.routes.js';
import quizRoutes, { templateRouter, importRouter } from './src/routes/quiz.routes.js';
import sessionRoutes from './src/routes/session.routes.js';
import userRoutes from './src/routes/user.routes.js';
import tagRoutes from './src/routes/tag.routes.js';
import questionBankRoutes from './src/routes/questionBank.routes.js';
import soloRoutes from './src/routes/solo.routes.js';
import { requireAuth, requireAdmin } from './src/middleware/auth.js';
import { errorHandler, notFoundHandler } from './src/middleware/errorHandler.js';
import { env } from './src/config/environment.js';

// Import services (Phase 3: Service Layer)
import { roomService } from './src/services/room.service.js';
import { sessionService } from './src/services/session.service.js';
import { quizService } from './src/services/quiz.service.js';
import { autoModeService } from './src/services/autoMode.service.js';

// --------------------
// Helper: Auto-detect local IP
// --------------------
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  
  // Priority order: look for common network interface names
  const priorities = ['eth0', 'en0', 'wlan0', 'Wi-Fi', 'Ethernet'];
  
  // First, try priority interfaces
  for (const name of priorities) {
    const iface = interfaces[name];
    if (iface) {
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) {
          return addr.address;
        }
      }
    }
  }
  
  // Fallback: search all interfaces for first non-internal IPv4
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    for (const addr of iface) {
      // Skip internal (loopback) and IPv6 addresses
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  
  // Last resort fallback
  return 'localhost';
};

const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS Configuration - Allow credentials from any origin (mobile access via IP)
app.use(cors({
  origin: true, // Reflect request origin (allows any origin)
  credentials: true // Allow cookies (required for CSRF tokens)
}));

// Load .env file from root directory (for both Docker and local development)
// When running locally, looks for .env in parent directory
// When running in Docker, environment variables are passed via docker-compose.yml
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

// --------------------
// Debug Mode Detection (MUST BE FIRST)
// --------------------
const DEBUG_ENABLED = process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true';
const VERBOSE_LOGGING = process.env.VERBOSE_LOGGING === 'true' || DEBUG_ENABLED;

if (DEBUG_ENABLED) {
  console.log('🐛 Debug mode ENABLED - Debug API endpoints available at /api/debug/*');
  console.log('🐛 Debug interface available at http://localhost:3000/debug');

  // Serve debug HTML page BEFORE Vue static files
  app.get('/debug', (_req, res) => {
    res.sendFile(path.join(process.cwd(), 'debug.html'));
  });
} else {
  console.log('🔒 Debug mode DISABLED - Set NODE_ENV=development to enable debug endpoints');
}

// Serve Vue 3 Vite dist/ folder (production build)
// This contains the compiled Vue app, styles, and assets
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// Serve uploaded media files (question images)
const uploadsPath = path.join(process.cwd(), 'public', 'uploads');
app.use('/uploads', express.static(uploadsPath));

const PORT = process.env.APP_PORT || 3000;
const QUIZ_FOLDER = path.join(process.cwd(), 'quizzes'); // Legacy folder kept for backward compatibility
const COMPLETED_FOLDER = path.join(QUIZ_FOLDER, 'completed'); // Still used for session storage (will migrate later)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// --------------------
// PostgreSQL Connection Pool
// --------------------
// NOTE: Connection pool size does NOT limit number of players/users
// Pool connections are borrowed for milliseconds to run queries, then returned
// 10 connections can easily handle 1000+ concurrent players
// Increase only if you see "pool timeout" errors under heavy load
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://trivia:trivia@db:5432/trivia',
  max: 10, // Maximum number of database connections in the pool (NOT player limit)
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established (increased for initial startup)
});

// Event handlers for connection pool
pool.on('connect', () => {
  // Verbose logging - only enable for debugging connection pool issues
  // console.log('✅ PostgreSQL client connected to pool');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err);
});

// Database connection and initialization happens in db-init.js
// No early connection test here to avoid confusing timeout errors

// --------------------
// Rate Limiting Configuration
// --------------------

// Rate limiter for authentication endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts. Please try again in 15 minutes.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting in debug mode for testing
  skip: () => DEBUG_ENABLED
});

// Rate limiter for player registration to prevent spam
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 registrations per hour per IP
  message: 'Too many registration attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => DEBUG_ENABLED
});

// Rate limiter for TOTP verification to prevent brute-force attacks
const totpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many 2FA verification attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => DEBUG_ENABLED
});

// --------------------
// CSRF Protection Configuration
// --------------------

// Configure CSRF protection with csrf-csrf
const csrfProtection = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || 'your-csrf-secret-change-in-production',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    // CHANGED: 'lax' allows cross-origin GET requests (mobile access via IP)
    // 'strict' would block all cross-origin requests, breaking mobile access
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600000 // 1 hour
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
  getSessionIdentifier: (req) => req.session?.id || req.ip // Use session ID or IP as identifier
});

const generateCsrfToken = csrfProtection.generateCsrfToken;
const doubleCsrfProtection = csrfProtection.doubleCsrfProtection;

// --------------------
// Database Helper Functions
// --------------------
// Note: These helpers are used by Socket.IO event handlers
// REST API routes use modular controllers in src/controllers/

/**
 * Fetch a complete quiz by ID with all questions and answers
 * Used by Socket.IO handlers for room management
 * (Phase 3: Wrapper for quizService.getQuizById)
 * @param {number} quizId - The quiz ID to fetch
 * @returns {Promise<Object>} Quiz object with questions and answers
 */
const getQuizById = async (quizId) => {
  return await quizService.getQuizById(quizId);
};

// Use HOST_IP from environment (set by docker-compose), or auto-detect, or use SERVER_URL from .env
const HOST_IP_ENV = process.env.HOST_IP;
const LOCAL_IP = getLocalIP();
const SERVER_URL = process.env.SERVER_URL || (HOST_IP_ENV ? `http://${HOST_IP_ENV}:${PORT}` : `http://${LOCAL_IP}:${PORT}`);

console.log(`🌐 Detected Local IP: ${LOCAL_IP}`);
console.log(`🌐 Host IP from environment: ${HOST_IP_ENV || 'not set'}`);
console.log(`🔗 Server URL for QR codes: ${SERVER_URL}`);
console.log(`🔐 Admin password loaded: ${ADMIN_PASSWORD ? '***set***' : 'NOT SET - using default'}`);

// Ensure completed folder exists
await fs.mkdir(COMPLETED_FOLDER, { recursive: true });

// --------------------
// Helper: list quizzes (REMOVED - now using database)
// --------------------
// Old file-based function removed - use listQuizzesFromDB() instead

// --------------------
// Helper: save session to database (Phase 3: Wrapper for sessionService.saveSession)
// --------------------
const saveSession = async (roomCode, room) => {
  return await sessionService.saveSession(roomCode, room);
};

// --------------------
// Helper: check if session has answers
// --------------------
const sessionHasAnswers = (room) => {
  return Object.values(room.players).some(player =>
    player.answers && Object.keys(player.answers).length > 0
  );
};

// --------------------
// Middleware: Authentication
// --------------------

// Authentication middleware now imported from src/middleware/auth.js

// --------------------
// Routes: Simple Authentication
// --------------------

// CSRF token endpoint - GET is excluded from CSRF protection
app.get('/api/csrf-token', (req, res) => {
  const csrfToken = generateCsrfToken(req, res);
  res.json({ csrfToken });
});

// --------------------
// Routes: Authentication (NEW - Modular Architecture)
// --------------------
// Apply rate limiting and CSRF protection to specific auth routes
app.use('/api/auth/player-login', authLimiter, doubleCsrfProtection);
app.use('/api/auth/register-player', registrationLimiter, doubleCsrfProtection);
app.use('/api/auth/totp/verify', totpLimiter);
app.use('/api/auth', authRoutes);

// --------------------
// Routes: Quiz Management (NEW - Modular Architecture)
// --------------------
// Apply CSRF protection to quiz mutation routes
app.use('/api/quizzes', (req, res, next) => {
  // Apply CSRF protection only to POST, PUT, DELETE
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return doubleCsrfProtection(req, res, next);
  }
  next();
});
app.use('/api/quizzes', quizRoutes);
app.use('/api/quiz-template', templateRouter);
app.use('/api/import-quiz', doubleCsrfProtection, importRouter);

// Routes: Session Management (NEW - Modular Architecture)
// Apply CSRF protection to session mutation routes
app.use('/api/sessions', (req, res, next) => {
  // Apply CSRF protection only to DELETE
  if (req.method === 'DELETE') {
    return doubleCsrfProtection(req, res, next);
  }
  next();
});
app.use('/api/sessions', sessionRoutes);

// Routes: User Management (NEW - Modular Architecture)
// Apply CSRF protection to user mutation routes
app.use('/api/users', (req, res, next) => {
  // Apply CSRF protection to DELETE and POST (mutation operations)
  if (['DELETE', 'POST'].includes(req.method)) {
    return doubleCsrfProtection(req, res, next);
  }
  next();
});
app.use('/api/users', userRoutes);

// Tag routes (Question Bank tagging system)
app.use('/api/tags', tagRoutes);

// Question Bank routes
app.use('/api/questions', (req, res, next) => {
  // Apply CSRF protection to mutation operations
  if (['DELETE', 'POST', 'PUT'].includes(req.method)) {
    return doubleCsrfProtection(req, res, next);
  }
  next();
});
app.use('/api/questions', questionBankRoutes);

// Solo play routes (public, no auth required) - v5.4.0
app.use('/api/solo', soloRoutes);

// Simple password check
app.post('/api/auth/check', authLimiter, doubleCsrfProtection, (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    console.log('✅ Admin auth successful');
    res.json({ success: true });
  } else {
    console.log('❌ Admin auth failed');
    res.status(401).json({ success: false });
  }
});

// --------------------
// Routes: QR Code Generation
// --------------------

// Generate QR code for player page
app.get('/api/qr/player', async (req, res) => {
  try {
    const playerUrl = `${SERVER_URL}/player`;
    const qrCode = await QRCode.toDataURL(playerUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    res.json({ qrCode, url: playerUrl });
  } catch (err) {
    console.error('QR code generation error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Generate QR code for specific room
app.get('/api/qr/room/:roomCode', async (req, res) => {
  try {
    const roomCode = req.params.roomCode;
    const roomUrl = `${SERVER_URL}/player?room=${roomCode}`;
    const qrCode = await QRCode.toDataURL(roomUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    res.json({ qrCode, url: roomUrl, roomCode });
  } catch (err) {
    console.error('QR code generation error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// --------------------
// Routes: Quiz Options
// --------------------

// Get quiz options
// Get quiz options (from database) - v5.4.0: includes auto-mode timer defaults
app.get('/api/options', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT setting_key, setting_value FROM app_settings
       WHERE setting_key IN ('answer_display_time', 'default_question_timer', 'default_reveal_delay')`
    );

    // Build options object from results
    const settings = {};
    for (const row of result.rows) {
      settings[row.setting_key] = parseInt(row.setting_value);
    }

    res.json({
      answerDisplayTime: settings.answer_display_time || 30,
      defaultQuestionTimer: settings.default_question_timer || 30,
      defaultRevealDelay: settings.default_reveal_delay || 5,
    });
  } catch (err) {
    console.error('Error fetching options:', err);
    res.json({ answerDisplayTime: 30, defaultQuestionTimer: 30, defaultRevealDelay: 5 }); // Return defaults on error
  }
});

// Save quiz options (to database) - v5.4.0: includes auto-mode timer defaults
app.post('/api/options', requireAdmin, async (req, res) => {
  try {
    const { answerDisplayTime, defaultQuestionTimer, defaultRevealDelay } = req.body;

    // Validate input
    if (answerDisplayTime !== undefined && (answerDisplayTime < 5 || answerDisplayTime > 300)) {
      return res.status(400).json({ error: 'Answer display time must be between 5 and 300 seconds' });
    }
    if (defaultQuestionTimer !== undefined && (defaultQuestionTimer < 10 || defaultQuestionTimer > 120)) {
      return res.status(400).json({ error: 'Question timer must be between 10 and 120 seconds' });
    }
    if (defaultRevealDelay !== undefined && (defaultRevealDelay < 2 || defaultRevealDelay > 30)) {
      return res.status(400).json({ error: 'Reveal delay must be between 2 and 30 seconds' });
    }

    // Update settings
    const settingsToUpdate = [];
    if (answerDisplayTime !== undefined) {
      settingsToUpdate.push({ key: 'answer_display_time', value: answerDisplayTime, desc: 'Answer display timeout in seconds' });
    }
    if (defaultQuestionTimer !== undefined) {
      settingsToUpdate.push({ key: 'default_question_timer', value: defaultQuestionTimer, desc: 'Default question timer in seconds for auto-mode' });
    }
    if (defaultRevealDelay !== undefined) {
      settingsToUpdate.push({ key: 'default_reveal_delay', value: defaultRevealDelay, desc: 'Default delay between reveal and next question' });
    }

    for (const setting of settingsToUpdate) {
      await pool.query(`
        INSERT INTO app_settings (setting_key, setting_value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key)
        DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP
      `, [setting.key, setting.value.toString(), setting.desc]);
    }

    // Reload quiz options to update in-memory cache
    await loadQuizOptions();

    res.json({ success: true, options: req.body });
  } catch (err) {
    console.error('Error saving options:', err);
    res.status(500).json({ error: 'Failed to save options' });
  }
});

// --------------------
// Routes: Quiz CRUD (REMOVED - Now using modular architecture)
// --------------------
// Quiz routes have been extracted to src/routes/quiz.routes.js
// and src/controllers/quiz.controller.js

// --------------------
// Routes: Authentication (REMOVED - Now using modular architecture)
// --------------------
// All authentication routes moved to src/routes/auth.routes.js
// See lines 528-534 for new route registration

// --------------------
// Routes: User Management (REMOVED - Now using modular architecture)
// --------------------
// User routes have been extracted to src/routes/user.routes.js
// and src/controllers/user.controller.js

// ============================================================================
// Banned Display Names Management (Admin Only)
// ============================================================================

// Helper function to check if a display name is banned
async function isDisplayNameBanned(displayName) {
  try {
    const result = await pool.query(
      'SELECT id, pattern, pattern_type FROM banned_display_names'
    );

    const lowerDisplayName = displayName.toLowerCase();

    for (const ban of result.rows) {
      const lowerPattern = ban.pattern.toLowerCase();

      if (ban.pattern_type === 'exact') {
        // Exact match (case-insensitive)
        if (lowerDisplayName === lowerPattern) {
          return { banned: true, reason: `Display name "${displayName}" is not allowed` };
        }
      } else if (ban.pattern_type === 'contains') {
        // Contains match (case-insensitive)
        if (lowerDisplayName.includes(lowerPattern)) {
          return { banned: true, reason: `Display name contains banned word "${ban.pattern}"` };
        }
      }
    }

    return { banned: false };
  } catch (err) {
    console.error('Error checking banned display names:', err);
    // On error, allow the name (fail open)
    return { banned: false };
  }
}

// Get all banned display names (admin only)
app.get('/api/banned-names', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        bn.id,
        bn.pattern,
        bn.pattern_type,
        bn.created_at,
        u.username as banned_by
      FROM banned_display_names bn
      LEFT JOIN users u ON bn.banned_by = u.id
      ORDER BY bn.created_at DESC
    `);

    res.json({ success: true, bannedNames: result.rows });
  } catch (err) {
    console.error('Error fetching banned names:', err);
    res.status(500).json({ error: 'Failed to fetch banned names' });
  }
});

// Add a banned display name (admin only)
app.post('/api/banned-names', doubleCsrfProtection, requireAdmin, async (req, res) => {
  try {
    const { pattern, patternType } = req.body;
    const adminUserId = req.user.id;

    if (!pattern || !pattern.trim()) {
      return res.status(400).json({ error: 'Pattern is required' });
    }

    if (!['exact', 'contains'].includes(patternType)) {
      return res.status(400).json({ error: 'Pattern type must be "exact" or "contains"' });
    }

    // Check if pattern already exists
    const existingCheck = await pool.query(
      'SELECT id FROM banned_display_names WHERE LOWER(pattern) = LOWER($1) AND pattern_type = $2',
      [pattern.trim(), patternType]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'This pattern is already banned' });
    }

    const result = await pool.query(
      'INSERT INTO banned_display_names (pattern, pattern_type, banned_by) VALUES ($1, $2, $3) RETURNING *',
      [pattern.trim(), patternType, adminUserId]
    );

    console.log(`Display name pattern "${pattern}" (${patternType}) banned by admin ${adminUserId}`);
    res.json({ success: true, bannedName: result.rows[0] });
  } catch (err) {
    console.error('Error adding banned name:', err);
    res.status(500).json({ error: 'Failed to add banned name' });
  }
});

// Remove a banned display name (admin only)
app.delete('/api/banned-names/:id', doubleCsrfProtection, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM banned_display_names WHERE id = $1 RETURNING pattern',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Banned name not found' });
    }

    console.log(`Banned display name "${result.rows[0].pattern}" removed by admin`);
    res.json({ success: true, message: 'Banned name removed' });
  } catch (err) {
    console.error('Error removing banned name:', err);
    res.status(500).json({ error: 'Failed to remove banned name' });
  }
});

// Check which rooms from a list are currently active
app.post('/api/rooms/check-active', async (req, res) => {
  try {
    const { roomCodes } = req.body;

    if (!Array.isArray(roomCodes)) {
      return res.status(400).json({ error: 'roomCodes must be an array' });
    }

    // Filter room codes to only include those that exist in liveRooms
    const activeRooms = roomCodes.filter(code => roomService.liveRooms[code] !== undefined);

    res.json({ activeRooms });
  } catch (err) {
    console.error('Error checking active rooms:', err);
    res.status(500).json({ error: 'Failed to check active rooms' });
  }
});

// --------------------
// Routes: Session Management (REMOVED - Now using modular architecture)
// --------------------
// Session routes have been extracted to src/routes/session.routes.js
// and src/controllers/session.controller.js

// --------------------
// Routes: Player Progress
// --------------------

// Get player progress in current room
app.get('/api/player/progress/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const room = roomService.liveRooms[roomCode];
    if (!room) {
      return res.status(404).json({ error: 'Room not found or session ended' });
    }

    // Find player by username (check all players in room)
    const player = Object.values(room.players).find(p => p.username === username);
    if (!player) {
      return res.status(404).json({ error: 'Player not found in this room' });
    }

    // Build progress data
    const progress = {
      totalQuestions: room.quizData.questions.length,
      currentQuestionIndex: room.currentQuestionIndex,
      questionHistory: []
    };

    // Iterate through ALL questions in the quiz (not just presented ones)
    // This gives a complete picture of their progress
    room.quizData.questions.forEach((question, index) => {
      // Check if this question was presented (presentedQuestions is an array of indices)
      const wasPresented = room.presentedQuestions && room.presentedQuestions.includes(index);
      // Check if this question's answer was revealed (revealedQuestions is an array of indices)
      const wasRevealed = room.revealedQuestions && room.revealedQuestions.includes(index);

      // Get player's answer for this question
      const playerChoice = player.answers && player.answers[index] !== undefined
        ? player.answers[index]
        : null;

      // Determine if answer was correct (only if revealed)
      let isCorrect = false;
      if (wasRevealed && playerChoice !== null) {
        isCorrect = playerChoice === question.correctChoice;
      }

      progress.questionHistory.push({
        index: index,
        text: question.text,
        choices: question.choices,
        playerChoice: playerChoice,
        correctChoice: wasRevealed ? question.correctChoice : null,
        isCorrect: isCorrect,
        revealed: wasRevealed,
        presented: wasPresented
      });
    });

    res.json(progress);
  } catch (err) {
    console.error('Error fetching player progress:', err);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Get all players' progress in a room (for presenter standings)
app.get('/api/room/progress/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;

    const room = roomService.liveRooms[roomCode];
    if (!room) {
      return res.status(404).json({ error: 'Room not found or session ended' });
    }

    // Build progress data for all players (exclude spectators)
    const players = Object.values(room.players)
      .filter(player => !player.isSpectator) // Exclude spectators from standings
      .map(player => {
        // Count how many questions this player answered correctly
        let correctCount = 0;
        let answeredCount = 0;

        // Iterate through revealed questions to calculate scores
        if (room.revealedQuestions && Array.isArray(room.revealedQuestions)) {
          room.revealedQuestions.forEach(questionIndex => {
            const question = room.quizData.questions[questionIndex];
            const playerChoice = player.answers && player.answers[questionIndex] !== undefined
              ? player.answers[questionIndex]
              : null;

            if (playerChoice !== null) {
              answeredCount++;
              if (playerChoice === question.correctChoice) {
                correctCount++;
              }
            }
          });
        }

        return {
          name: player.displayName || player.username,
          username: player.username,
          correct: correctCount,
          answered: answeredCount,
          connected: player.connected,
          answers: player.answers || {}
        };
      });

    const roomProgress = {
      roomCode: roomCode,
      quizTitle: room.quizData.title,
      totalQuestions: room.quizData.questions.length,
      presentedCount: room.presentedQuestions ? room.presentedQuestions.length : 0,
      revealedCount: room.revealedQuestions ? room.revealedQuestions.length : 0,
      playerCount: players.length,
      players: players
    };

    res.json(roomProgress);
  } catch (err) {
    console.error('Error fetching room progress:', err);
    res.status(500).json({ error: 'Failed to fetch room progress' });
  }
});

// --------------------
// HTTP + Socket.IO Setup
// --------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingTimeout: 360000,   // 360 seconds (6 minutes) - must be longer than max answer display timeout (300s)
  pingInterval: 25000    // 25 seconds - keep default
});

// --------------------
// Live Rooms Logic with Session Recording (Phase 3: Using RoomService)
// --------------------
// REMOVED: const liveRooms = {}; - Now using roomService.liveRooms
let quizOptions = { answerDisplayTime: 30 }; // Default options

// Periodic Auto-Save Configuration (Phase 3: Using SessionService)
// REMOVED: const AUTO_SAVE_INTERVAL = 120000; - Now in sessionService
// REMOVED: const autoSaveIntervals = new Map(); - Now managed by sessionService

// Start periodic auto-save for a room (Phase 3: Using SessionService)
function startAutoSave(roomCode) {
  sessionService.scheduleAutoSave(roomCode, (code) => roomService.getRoom(code));
}

// Stop periodic auto-save for a room (Phase 3: Using SessionService)
function stopAutoSave(roomCode) {
  sessionService.clearAutoSave(roomCode);
}

// Quiz options will be loaded after database initialization
async function loadQuizOptions() {
  try {
    const result = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'answer_display_time'"
    );

    if (result.rows.length > 0) {
      quizOptions.answerDisplayTime = parseInt(result.rows[0].setting_value);
      console.log('📋 Quiz options loaded from database:', quizOptions);
    } else {
      console.log('📋 Using default quiz options');
    }
  } catch (err) {
    console.error('Error loading quiz options from database:', err);
    console.log('📋 Using default quiz options');
  }
}

// --------------------
// PHASE 2: Dual-ID Session Architecture
// --------------------
// Global session tracking for persistent player identification
const playerSessions = new Map(); // Map<playerID, { username, socketId, roomCode }>
const socketToPlayer = new Map(); // Map<socketId, playerID> - Reverse mapping for O(1) lookups

/**
 * Check if a PlayerID is already connected (multi-tab detection)
 * @param {string} playerID - Player Session ID
 * @param {string} currentSocketId - Current socket.id attempting to connect
 * @returns {boolean} - True if PlayerID is already connected with a DIFFERENT socketId
 */
const isPlayerIDAlreadyConnected = (playerID, currentSocketId) => {
  const playerSession = playerSessions.get(playerID);
  if (!playerSession) return false;

  // Check if the existing socketId is different AND still connected
  if (playerSession.socketId !== currentSocketId) {
    const existingSocket = io.sockets.sockets.get(playerSession.socketId);
    return existingSocket && existingSocket.connected;
  }

  return false;
};

/**
 * Register or update a player session
 * @param {string} playerID - Player Session ID
 * @param {string} socketId - Current socket.id
 * @param {string} username - Player username
 * @param {string} roomCode - Room code player is joining
 */
const registerPlayerSession = (playerID, socketId, username, roomCode) => {
  playerSessions.set(playerID, {
    username,
    socketId,
    roomCode,
    lastActive: Date.now()
  });
  socketToPlayer.set(socketId, playerID);

  if (DEBUG_ENABLED) {
    console.log('[SESSION DEBUG] Player session registered', {
      playerID,
      socketId,
      username,
      roomCode
    });
  }
};

/**
 * Clean up player session on disconnect
 * @param {string} socketId - Socket.id that disconnected
 */
const cleanupPlayerSession = (socketId) => {
  const playerID = socketToPlayer.get(socketId);
  if (playerID) {
    const playerSession = playerSessions.get(playerID);
    // Only remove if this socketId matches (don't remove if player reconnected with new socket)
    if (playerSession && playerSession.socketId === socketId) {
      playerSessions.delete(playerID);
      if (DEBUG_ENABLED) {
        console.log('[SESSION DEBUG] Player session cleaned up', { playerID, socketId });
      }
    }
    socketToPlayer.delete(socketId);
  }
};

// --------------------
// PHASE 3: RoomSessionID Architecture
// --------------------
// Track individual player attempts in specific rooms
const roomSessions = new Map(); // Map<playerID_roomCode, RoomSessionID>
const roomSessionData = new Map(); // Map<RoomSessionID, { playerID, roomCode, username, socketId, answers, joinedAt, lastActive }>
const socketToRoomSession = new Map(); // Map<socketId, RoomSessionID> - Reverse mapping

/**
 * Generate a RoomSessionID for a player in a specific room
 * @param {string} playerID - Player Session ID
 * @param {string} roomCode - Room code
 * @returns {string} - RoomSessionID (UUID format)
 */
const generateRoomSessionID = (playerID, roomCode) => {
  try {
    // Use crypto.randomUUID() from Node.js 14.17+ crypto module (already imported at top)
    return crypto.randomUUID();
  } catch (e) {
    // Fallback for older Node.js versions or if randomUUID not available
    return `rsid_${playerID.slice(0, 8)}_${roomCode}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
};

/**
 * Get or create a RoomSessionID for a player in a room
 * @param {string} playerID - Player Session ID
 * @param {string} roomCode - Room code
 * @param {string} username - Player username
 * @param {string} socketId - Current socket.id
 * @returns {string} - RoomSessionID
 */
const getOrCreateRoomSession = (playerID, roomCode, username, socketId) => {
  const sessionKey = `${playerID}_${roomCode}`;
  let roomSessionID = roomSessions.get(sessionKey);

  if (!roomSessionID) {
    // New room session - first time player joins this room
    roomSessionID = generateRoomSessionID(playerID, roomCode);
    roomSessions.set(sessionKey, roomSessionID);

    roomSessionData.set(roomSessionID, {
      playerID,
      roomCode,
      username,
      socketId,
      answers: {},
      joinedAt: new Date().toISOString(),
      lastActive: Date.now(),
      reconnectionCount: 0
    });

    if (DEBUG_ENABLED) {
      console.log('[ROOM SESSION] Created new RoomSessionID', {
        roomSessionID,
        playerID,
        roomCode,
        username,
        socketId
      });
    }
  } else {
    // Existing room session - player reconnecting
    const sessionData = roomSessionData.get(roomSessionID);
    if (sessionData) {
      sessionData.socketId = socketId;
      sessionData.lastActive = Date.now();
      sessionData.reconnectionCount = (sessionData.reconnectionCount || 0) + 1;

      if (DEBUG_ENABLED) {
        console.log('[ROOM SESSION] Updated existing RoomSessionID', {
          roomSessionID,
          playerID,
          roomCode,
          username,
          oldSocketId: sessionData.socketId,
          newSocketId: socketId,
          reconnectionCount: sessionData.reconnectionCount
        });
      }
    }
  }

  socketToRoomSession.set(socketId, roomSessionID);
  return roomSessionID;
};

/**
 * Update room session with answer data
 * @param {string} roomSessionID - Room Session ID
 * @param {number} questionIndex - Question index
 * @param {number} choiceIndex - Answer choice index
 */
const updateRoomSessionAnswer = (roomSessionID, questionIndex, choiceIndex) => {
  const sessionData = roomSessionData.get(roomSessionID);
  if (sessionData) {
    sessionData.answers[questionIndex] = choiceIndex;
    sessionData.lastActive = Date.now();

    if (DEBUG_ENABLED) {
      console.log('[ROOM SESSION] Answer recorded', {
        roomSessionID,
        questionIndex,
        choiceIndex,
        totalAnswers: Object.keys(sessionData.answers).length
      });
    }
  }
};

/**
 * Clean up room session on disconnect (but preserve data for reconnection)
 * @param {string} socketId - Socket.id that disconnected
 */
const markRoomSessionDisconnected = (socketId) => {
  const roomSessionID = socketToRoomSession.get(socketId);
  if (roomSessionID) {
    const sessionData = roomSessionData.get(roomSessionID);
    if (sessionData) {
      sessionData.lastActive = Date.now();
      sessionData.disconnectedAt = new Date().toISOString();

      if (DEBUG_ENABLED) {
        console.log('[ROOM SESSION] Marked as disconnected (data preserved)', {
          roomSessionID,
          playerID: sessionData.playerID,
          roomCode: sessionData.roomCode,
          answersPreserved: Object.keys(sessionData.answers).length
        });
      }
    }
    socketToRoomSession.delete(socketId);
  }
};

/**
 * Permanently delete room session (on room deletion or quiz completion)
 * @param {string} roomSessionID - Room Session ID
 */
const deleteRoomSession = (roomSessionID) => {
  const sessionData = roomSessionData.get(roomSessionID);
  if (sessionData) {
    const sessionKey = `${sessionData.playerID}_${sessionData.roomCode}`;
    roomSessions.delete(sessionKey);
    roomSessionData.delete(roomSessionID);

    if (DEBUG_ENABLED) {
      console.log('[ROOM SESSION] Permanently deleted', {
        roomSessionID,
        playerID: sessionData.playerID,
        roomCode: sessionData.roomCode
      });
    }
  }
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // PHASE 2: Extract PlayerID from socket auth
  const playerID = socket.handshake.auth?.playerID;
  if (playerID && DEBUG_ENABLED) {
    console.log('[SESSION DEBUG] Socket connected with PlayerID:', {
      socketId: socket.id,
      playerID
    });
  }

  // Send active rooms immediately on connection
  socket.emit('activeRoomsUpdate', getActiveRoomsSummary());

  // Helper: Leave all previous rooms before joining a new one
  // This prevents cross-room event pollution when presenters switch rooms
  const leaveAllRooms = () => {
    const rooms = Array.from(socket.rooms);
    for (const room of rooms) {
      // Don't leave the socket's own room (socket.id is automatically a room)
      if (room !== socket.id) {
        socket.leave(room);
        console.log(`[ROOM] Socket ${socket.id} left room ${room}`);
      }
    }
  };

  // Get active rooms (manual request)
  socket.on('getActiveRooms', () => {
    socket.emit('activeRoomsUpdate', getActiveRoomsSummary());
  });

  // Presenter creates a room
  socket.on('createRoom', async ({ roomCode, quizFilename, userId }) => {
    try {
      // Extract quiz ID from filename format (quiz_123.json → 123)
      const quizId = quizFilename.includes('_')
        ? parseInt(quizFilename.split('_')[1].replace('.json', ''))
        : parseInt(quizFilename);

      if (isNaN(quizId)) {
        return socket.emit('roomError', 'Invalid quiz ID format');
      }

      // Fetch quiz from database
      const quiz = await getQuizById(quizId);
      if (!quiz) {
        return socket.emit('roomError', 'Quiz not found');
      }

      // Convert database format to legacy format for compatibility
      const quizData = {
        filename: quizFilename,
        title: quiz.title,
        description: quiz.description,
        questions: quiz.questions.map(q => ({
          id: q.id,
          text: q.text,
          type: q.type || 'multiple_choice',
          imageUrl: q.imageUrl || null,
          imageType: q.imageType || null,
          choices: q.choices.map(c => c.text),
          correctChoice: q.choices.findIndex(c => c.isCorrect)
        }))
      };

      // Check if room already exists (presenter reconnecting)
      if (roomService.liveRooms[roomCode]) {
        // Presenter is reconnecting - update presenter socket ID
        console.log(`✅ [PRESENTER] Reconnected to room ${roomCode}`);
        roomService.liveRooms[roomCode].presenterId = socket.id;
      } else {
        // Create new room
        roomService.liveRooms[roomCode] = {
          quizFilename,
          quizId,
          quizData,
          players: {},
          presenterId: socket.id,
          currentQuestionIndex: null,
          presentedQuestions: [],
          revealedQuestions: [],
          kickedPlayers: {}, // { username: kickedTimestamp }
          status: 'in_progress',
          createdAt: new Date().toISOString(),
          createdBy: userId || 1, // Admin user ID who created the room
          // Auto-mode fields (v5.4.0)
          autoMode: false,
          questionTimer: null,
          revealDelay: null,
        };
        console.log(`Room ${roomCode} created for quiz ID ${quizId} (${quiz.title}) by admin ${userId || 1}`);
      }

      // Leave any previous rooms before joining new one (prevents cross-room event pollution)
      leaveAllRooms();
      socket.join(roomCode);

      // Log room state being sent to presenter
      const roomState = {
        currentQuestionIndex: roomService.liveRooms[roomCode].currentQuestionIndex,
        presentedQuestions: roomService.liveRooms[roomCode].presentedQuestions,
        revealedQuestions: roomService.liveRooms[roomCode].revealedQuestions
      };
      console.log(`[PRESENTER] Sending room state to presenter for room ${roomCode}:`, roomState);

      socket.emit('roomCreated', {
        roomCode,
        quizFilename: roomService.liveRooms[roomCode].quizFilename,
        quizTitle: quizData.title,
        questions: quizData.questions,
        currentQuestionIndex: roomService.liveRooms[roomCode].currentQuestionIndex,
        presentedQuestions: roomService.liveRooms[roomCode].presentedQuestions,
        revealedQuestions: roomService.liveRooms[roomCode].revealedQuestions,
        isResumed: !!roomService.liveRooms[roomCode].players && Object.keys(roomService.liveRooms[roomCode].players).length > 0,
        // Auto-mode state (v5.4.0)
        autoMode: roomService.liveRooms[roomCode].autoMode || false,
        questionTimer: roomService.liveRooms[roomCode].questionTimer,
        revealDelay: roomService.liveRooms[roomCode].revealDelay,
        autoModeState: autoModeService.getState(roomCode)
      });

      // Send current player list to presenter (especially important on reconnection)
      io.to(roomCode).emit('playerListUpdate', {
        roomCode,
        players: Object.values(roomService.liveRooms[roomCode].players).filter(p => !p.isSpectator)
      });

      io.emit('activeRoomsUpdate', getActiveRoomsSummary());
    } catch (err) {
      console.error('Error creating room:', err);
      socket.emit('roomError', 'Failed to load quiz.');
    }
  });

  // Presenter resumes an incomplete session
  socket.on('resumeSession', async ({ sessionFilename, userId, isRootAdmin }) => {
    try {
      if (env.isVerboseLogging) {
        console.log(`[RESUME] Attempting to resume session: ${sessionFilename} (User: ${userId}, Root: ${isRootAdmin})`);
      }

      // Extract session ID from filename (session_123.json → 123)
      const sessionId = sessionFilename.includes('_')
        ? parseInt(sessionFilename.split('_')[1].replace('.json', ''))
        : parseInt(sessionFilename);

      if (isNaN(sessionId)) {
        console.error(`[RESUME] ❌ Invalid session ID format: ${sessionFilename}`);
        return socket.emit('roomError', 'Invalid session ID format');
      }

      if (env.isVerboseLogging) {
        console.log(`[RESUME] Parsed session ID: ${sessionId}`);
      }

      // Load session data from database
      const sessionResult = await pool.query(`
        SELECT
          gs.id,
          gs.room_code as original_room_code,
          gs.quiz_id,
          gs.created_at,
          gs.created_by,
          q.title as quiz_title
        FROM game_sessions gs
        JOIN quizzes q ON gs.quiz_id = q.id
        WHERE gs.id = $1
      `, [sessionId]);

      if (sessionResult.rows.length === 0) {
        console.error(`[RESUME] ❌ Session not found in database: ${sessionId}`);
        return socket.emit('roomError', 'Session not found');
      }

      const session = sessionResult.rows[0];

      // Validate ownership: only session creator or root admin can resume
      if (!isRootAdmin && session.created_by && session.created_by !== userId) {
        console.error(`[RESUME] ❌ Access denied: User ${userId} cannot resume session owned by ${session.created_by}`);
        return socket.emit('roomError', 'You can only resume sessions you created');
      }

      if (env.isVerboseLogging) {
        console.log(`[RESUME] Session found - Quiz ID: ${session.quiz_id}, Original Room: ${session.original_room_code}`);
      }

      // Generate new room code for resumed session
      const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
      if (env.isVerboseLogging) {
        console.log(`[RESUME] Generated new room code: ${roomCode}`);
      }

      // Load the quiz data from database
      if (env.isVerboseLogging) {
        console.log(`[RESUME] Loading quiz data for quiz_id: ${session.quiz_id}`);
      }
      const quiz = await getQuizById(session.quiz_id);
      if (!quiz) {
        console.error(`[RESUME] ❌ Quiz not found for session. Quiz ID: ${session.quiz_id} may have been deleted or marked inactive.`);
        return socket.emit('roomError', `Quiz not found for this session. The quiz may have been deleted.`);
      }
      if (env.isVerboseLogging) {
        console.log(`[RESUME] ✅ Quiz loaded: ${quiz.title} with ${quiz.questions.length} questions`);
      }

      // Convert database format to legacy format for compatibility
      const quizData = {
        filename: `quiz_${session.quiz_id}.json`,
        title: quiz.title,
        description: quiz.description,
        questions: quiz.questions.map(q => ({
          id: q.id,
          text: q.text,
          type: q.type || 'multiple_choice',
          imageUrl: q.imageUrl || null,
          imageType: q.imageType || null,
          choices: q.choices.map(c => c.text),
          correctChoice: q.choices.findIndex(c => c.isCorrect)
        }))
      };

      // Load participants and their answers from database
      const participantsResult = await pool.query(`
        SELECT
          gp.user_id,
          gp.display_name,
          u.username,
          pa.question_id,
          sq.presentation_order,
          a.display_order as choice_index
        FROM game_participants gp
        JOIN users u ON gp.user_id = u.id
        LEFT JOIN participant_answers pa ON gp.id = pa.participant_id
        LEFT JOIN session_questions sq ON pa.question_id = sq.question_id AND sq.game_session_id = $1
        LEFT JOIN answers a ON pa.answer_id = a.id
        WHERE gp.game_session_id = $1
        ORDER BY gp.display_name
      `, [sessionId]);

      // Reconstruct players from database data (keyed by username for matching)
      const playersMap = new Map();
      for (const row of participantsResult.rows) {
        if (!playersMap.has(row.username)) {
          const playerId = `temp_${row.username}`;
          // Detect spectators by username or display name
          const isSpectator = row.username === 'Display' || row.display_name === 'Spectator Display';
          playersMap.set(row.username, {
            id: playerId,
            username: row.username, // Account username
            name: row.display_name, // Display name from session
            userId: row.user_id, // Preserve user_id for reconnection
            choice: null,
            connected: false,
            connectionState: 'disconnected', // Mark resumed players as disconnected until they rejoin
            answers: {},
            isResumed: true,
            isSpectator // Mark spectators properly when loading from database
          });
        }
        if (row.presentation_order !== null && row.choice_index !== null) {
          playersMap.get(row.username).answers[row.presentation_order] = row.choice_index;
        }
      }

      const players = {};
      for (const playerData of playersMap.values()) {
        players[playerData.id] = playerData;
      }

      // Load presented and revealed questions
      const questionsResult = await pool.query(`
        SELECT presentation_order, is_presented, is_revealed
        FROM session_questions
        WHERE game_session_id = $1
        ORDER BY presentation_order
      `, [sessionId]);

      const presentedQuestions = [];
      const revealedQuestions = [];
      for (const row of questionsResult.rows) {
        if (row.is_presented) presentedQuestions.push(row.presentation_order);
        if (row.is_revealed) revealedQuestions.push(row.presentation_order);
      }

      // Determine current question index when resuming
      // If there's a question that's been presented but not revealed, that's the current question
      let currentQuestionIndex = null;
      const liveQuestion = presentedQuestions.find(qIndex => !revealedQuestions.includes(qIndex));
      if (liveQuestion !== undefined) {
        currentQuestionIndex = liveQuestion;
        console.log(`[RESUME] Found live question ${liveQuestion} (presented but not revealed)`);
      }

      roomService.liveRooms[roomCode] = {
        quizFilename: `quiz_${session.quiz_id}.json`,
        quizId: session.quiz_id,
        quizData,
        players,
        presenterId: socket.id,
        currentQuestionIndex,
        presentedQuestions,
        revealedQuestions,
        kickedPlayers: {}, // { username: kickedTimestamp }
        status: 'in_progress',
        createdAt: session.created_at,
        createdBy: session.created_by || 1, // Admin user ID who created the session
        resumedAt: new Date().toISOString(),
        originalRoomCode: session.original_room_code,
        originalSessionId: sessionId
      };

      if (env.isVerboseLogging) {
        console.log(`Room ${roomCode} resumed from session ID ${sessionId} (original room: ${session.original_room_code})`);
      }

      // Leave any previous rooms before joining new one (prevents cross-room event pollution)
      leaveAllRooms();
      socket.join(roomCode);
      socket.emit('roomCreated', {
        roomCode,
        quizFilename: roomService.liveRooms[roomCode].quizFilename,
        quizTitle: quizData.title,
        questions: quizData.questions,
        currentQuestionIndex: roomService.liveRooms[roomCode].currentQuestionIndex,
        presentedQuestions: roomService.liveRooms[roomCode].presentedQuestions,
        revealedQuestions: roomService.liveRooms[roomCode].revealedQuestions,
        isResumed: true,
        originalRoomCode: session.original_room_code
      });

      // Send the player list to the presenter (shows disconnected players from previous session, excluding spectators)
      io.to(roomCode).emit('playerListUpdate', {
        roomCode,
        players: Object.values(roomService.liveRooms[roomCode].players).filter(p => !p.isSpectator)
      });

      // Start auto-save if session has already been in progress
      if (presentedQuestions.length > 0) {
        startAutoSave(roomCode);
        if (env.isVerboseLogging) {
          console.log(`[RESUME] Auto-save started for room ${roomCode}`);
        }
      }

      if (env.isVerboseLogging) {
        console.log(`[RESUME] ✅ Session ${sessionId} successfully resumed as room ${roomCode}`);
      }
      io.emit('activeRoomsUpdate', getActiveRoomsSummary());
    } catch (err) {
      console.error(`[RESUME] ❌ Error resuming session:`, err);
      socket.emit('roomError', 'Failed to resume session: ' + err.message);
    }
  });

  // Presenter views a room
  socket.on('viewRoom', ({ roomCode, userId, isRootAdmin }) => {
    const room = roomService.liveRooms[roomCode];
    if (!room) {
      socket.emit('roomError', 'Room not found.');
      return;
    }

    // Validate ownership: only room creator or root admin can view
    if (!isRootAdmin && room.createdBy && room.createdBy !== userId) {
      console.error(`[VIEW] Access denied: User ${userId} cannot view room owned by ${room.createdBy}`);
      socket.emit('roomError', 'You can only view rooms you created');
      return;
    }

    // Leave any previous rooms before joining new one (prevents cross-room event pollution)
    leaveAllRooms();
    socket.join(roomCode);
    socket.emit('roomRestored', {
      roomCode,
      quizTitle: room.quizData.title,
      questions: room.quizData.questions,
      currentQuestionIndex: room.currentQuestionIndex,
      players: Object.values(room.players).filter(p => !p.isSpectator), // Filter out spectators
      presentedQuestions: room.presentedQuestions || [],
      revealedQuestions: room.revealedQuestions || []
    });

    // If there's a current question active, send it to the viewer
    if (room.currentQuestionIndex !== null) {
      const question = room.quizData.questions[room.currentQuestionIndex];
      const isRevealed = room.revealedQuestions && room.revealedQuestions.includes(room.currentQuestionIndex);

      // Include revealed status for viewers
      const questionData = {
        ...question,
        revealed: isRevealed,
        correctChoice: isRevealed ? question.correctChoice : undefined
      };

      socket.emit('questionPresented', { questionIndex: room.currentQuestionIndex, question: questionData });
    }
  });

  // Player joins a room
  socket.on('joinRoom', async ({ roomCode, username, displayName, playerID }) => {
    if (DEBUG_ENABLED) {
      console.log('[JOIN DEBUG] joinRoom event received', {
        roomCode,
        username,
        displayName,
        playerID,  // PHASE 2: Log PlayerID
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    }

    // PHASE 2: Multi-tab detection
    if (playerID && isPlayerIDAlreadyConnected(playerID, socket.id)) {
      console.log(`[MULTI-TAB BLOCKED] PlayerID ${playerID} already connected in another tab`);
      socket.emit('roomError', 'Already connected in another tab. Please close other tabs and try again.');
      return;
    }

    const room = roomService.liveRooms[roomCode];
    if (!room) {
      console.log(`[JOIN ERROR] Room not found: ${roomCode} (requested by ${username}/${displayName})`);
      if (DEBUG_ENABLED) {
        console.log('[JOIN DEBUG] Available rooms:', Object.keys(roomService.liveRooms));
      }
      socket.emit('roomError', 'Room not found.');
      return;
    }

    // Support legacy playerName parameter for backward compatibility
    const playerUsername = username;
    const playerDisplayName = displayName;

    // Track user agent for mobile-specific handling and diagnostics
    const userAgent = socket.handshake.headers['user-agent'] || '';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);

    if (DEBUG_ENABLED) {
      console.log('[JOIN DEBUG] Client info', {
        username: playerUsername,
        displayName: playerDisplayName,
        socketId: socket.id,
        isMobile,
        userAgent: userAgent.substring(0, 50) + '...'
      });
    }

    if (!playerUsername || !playerDisplayName) {
      socket.emit('roomError', 'Username and display name are required.');
      return;
    }

    // Check if player was recently kicked (5 second cooldown)
    if (room.kickedPlayers && room.kickedPlayers[playerUsername]) {
      const kickedTime = room.kickedPlayers[playerUsername];
      const cooldownMs = 5000; // 5 seconds
      const timeElapsed = Date.now() - kickedTime;

      if (timeElapsed < cooldownMs) {
        const remainingSeconds = Math.ceil((cooldownMs - timeElapsed) / 1000);
        socket.emit('roomError', `You were removed from this session. Please wait ${remainingSeconds} second(s) before rejoining.`);
        return;
      }

      // Cooldown expired, remove from kicked list
      delete room.kickedPlayers[playerUsername];
    }

    // Determine if this is a spectator (needed throughout the function)
    const isSpectator = playerUsername === 'Display' || playerDisplayName === 'Spectator Display';

    // Check if display name is banned (skip for spectators)
    if (!isSpectator) {
      const banCheck = await isDisplayNameBanned(playerDisplayName);
      if (banCheck.banned) {
        socket.emit('roomError', banCheck.reason);
        return;
      }
    }

    // Create or retrieve guest user account (using username)
    let userId = null;
    try {
      // Check if user already exists
      const userResult = await pool.query(
        'SELECT id, account_type FROM users WHERE username = $1',
        [playerUsername]
      );

      if (userResult.rows.length > 0) {
        // User already exists
        userId = userResult.rows[0].id;
        // Only log for non-spectators to reduce noise
        if (!isSpectator) {
          const accountType = userResult.rows[0].account_type;
          const accountTypeLabel = accountType === 'player' ? 'Registered player' : 'Guest user';
          console.log(`${accountTypeLabel} "${playerUsername}" already exists with ID: ${userId}`);
        }
      } else {
        // Create new guest user
        const createResult = await pool.query(
          'INSERT INTO users (username, account_type, password_hash) VALUES ($1, $2, NULL) RETURNING id',
          [playerUsername, 'guest']
        );
        userId = createResult.rows[0].id;
        if (!isSpectator) {
          console.log(`Created new guest user "${playerUsername}" with ID: ${userId}`);
        }
      }
    } catch (err) {
      console.error('Error creating/retrieving guest user:', err);
      socket.emit('roomError', 'Failed to create user account. Please try again.');
      return;
    }

    // PHASE 2: Check if PlayerID exists in room (reconnection scenario)
    let existingPlayerEntry = null;
    let existingPlayerData = null;

    if (playerID) {
      // NEW: PlayerID-based lookup (O(n) search for playerID in room.players)
      for (const [socketId, player] of Object.entries(room.players)) {
        if (player.playerID === playerID) {
          existingPlayerEntry = [socketId, player];
          existingPlayerData = player;
          break;
        }
      }

      if (DEBUG_ENABLED && existingPlayerEntry) {
        console.log('[JOIN DEBUG] Found existing player by PlayerID (RECONNECTION)', {
          playerID,
          oldSocketId: existingPlayerEntry[0],
          newSocketId: socket.id,
          username: playerUsername
        });
      }
    }

    // FALLBACK: If no PlayerID or PlayerID not found, use old username-based lookup
    // This ensures backward compatibility during transition phase
    if (!existingPlayerEntry) {
      // Find ALL existing entries for this username (not just the first one)
      // This fixes the zombie connection bug where multiple disconnected entries accumulate
      const existingPlayers = Object.entries(room.players).filter(([, player]) => player.username === playerUsername);

      if (DEBUG_ENABLED) {
        console.log('[JOIN DEBUG] Checking for existing player entries by username (FALLBACK)', {
          username: playerUsername,
          existingEntriesCount: existingPlayers.length,
          newSocketId: socket.id,
          existingSocketIds: existingPlayers.map(([socketId]) => socketId)
        });
      }

      if (existingPlayers.length > 0) {
        existingPlayerEntry = existingPlayers[0]; // Use first entry
        existingPlayerData = existingPlayers[0][1];
      }
    }

    // Handle existing player (reconnection)
    if (existingPlayerEntry) {
      const [oldSocketId, playerData] = existingPlayerEntry;

      // PHASE 2: Reconnection detected - update socketId, preserve all state
      if (DEBUG_ENABLED) {
        console.log('[JOIN DEBUG] Reconnection - updating socketId', {
          playerID,
          oldSocketId,
          newSocketId: socket.id,
          username: playerUsername
        });
      }

      // Check if old socket is still connected (force disconnect to prevent duplicates)
      if (oldSocketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket && oldSocket.connected) {
          console.log(`[RECONNECT] Force-disconnecting old socket ${oldSocketId} for ${playerUsername}`);
          oldSocket.disconnect(true);
        }
        // Delete old player entry
        delete room.players[oldSocketId];
      }

      // Determine if they already answered the current question
      let currentChoice = null;
      if (room.currentQuestionIndex !== null && playerData.answers && playerData.answers[room.currentQuestionIndex] !== undefined) {
        currentChoice = playerData.answers[room.currentQuestionIndex];
      }

      // Create fresh player entry with preserved answers and PlayerID
      room.players[socket.id] = {
        ...playerData,
        id: socket.id,
        username: playerUsername,
        name: playerDisplayName,
        userId: userId,
        playerID: playerID,  // PHASE 2: Store PlayerID in player object
        connected: true,
        connectionState: 'connected',
        choice: currentChoice,
        isSpectator: playerUsername === 'Display' || playerDisplayName === 'Spectator Display',
        userAgent: userAgent,
        isMobile: isMobile,
        lastHeartbeat: Date.now()
      };

      socket.join(roomCode);

      if (!isSpectator) {
        const answersCount = Object.keys(playerData.answers || {}).length;
        console.log(`${playerDisplayName} (${playerUsername}) reconnected to room ${roomCode} (${answersCount} previous answers preserved)`);
      }

      // PHASE 2: Register PlayerID session
      if (playerID) {
        registerPlayerSession(playerID, socket.id, playerUsername, roomCode);

        // PHASE 3: Get or create RoomSessionID for this player in this room
        const roomSessionID = getOrCreateRoomSession(playerID, roomCode, playerUsername, socket.id);
        room.players[socket.id].roomSessionID = roomSessionID;

        if (DEBUG_ENABLED) {
          console.log('[ROOM SESSION] Player rejoined with session', {
            roomSessionID,
            playerID,
            roomCode,
            username: playerUsername,
            answersPreserved: Object.keys(playerData.answers || {}).length
          });
        }
      }
    } else {
      // Check if this is a resumed session with temp player entry
      let existingAnswers = {};
      const tempPlayerId = `temp_${playerUsername}`;
      if (room.players[tempPlayerId] && room.players[tempPlayerId].isResumed) {
        // Player is rejoining a resumed session - keep their old answers
        existingAnswers = room.players[tempPlayerId].answers || {};
        delete room.players[tempPlayerId]; // Remove temp entry
        // Only log for non-spectators (use isSpectator variable defined earlier)
        if (!isSpectator) {
          console.log(`${playerDisplayName} (${playerUsername}) rejoined resumed session with ${Object.keys(existingAnswers).length} previous answers`);
        }
      }

      // New player joining
      room.players[socket.id] = {
        id: socket.id,
        username: playerUsername, // Account username
        name: playerDisplayName, // Display name shown in games
        userId: userId, // Associate with user account
        playerID: playerID,  // PHASE 2: Store PlayerID for persistent identification
        choice: null,
        connected: true,
        connectionState: 'connected', // 'connected' | 'away' | 'disconnected' | 'warning'
        answers: existingAnswers,
        isSpectator: playerUsername === 'Display' || playerDisplayName === 'Spectator Display', // Flag spectators
        userAgent: userAgent, // Track for diagnostics and mobile-specific handling
        isMobile: isMobile,
        lastHeartbeat: Date.now() // Track connection health
      };
      socket.join(roomCode);
      // Only log for non-spectators (use isSpectator variable defined earlier)
      if (!isSpectator) {
        console.log(`${playerDisplayName} (${playerUsername}) joined room ${roomCode}`);
      }

      // PHASE 2: Register PlayerID session for new player
      if (playerID) {
        registerPlayerSession(playerID, socket.id, playerUsername, roomCode);

        // PHASE 3: Create new RoomSessionID for this player in this room
        const roomSessionID = getOrCreateRoomSession(playerID, roomCode, playerUsername, socket.id);
        room.players[socket.id].roomSessionID = roomSessionID;

        if (DEBUG_ENABLED) {
          console.log('[ROOM SESSION] New player joined with new session', {
            roomSessionID,
            playerID,
            roomCode,
            username: playerUsername
          });
        }
      }
    }

    const playersToEmit = Object.values(room.players).filter(p => !p.isSpectator);
    if (DEBUG_ENABLED) {
      console.log('[JOIN DEBUG] Emitting playerListUpdate', {
        roomCode,
        playersCount: playersToEmit.length,
        newPlayerSocketId: socket.id,
        newPlayerUsername: playerUsername,
        newPlayerDisplayName: playerDisplayName,
        allPlayerSocketIds: playersToEmit.map(p => p.id),
        timestamp: new Date().toISOString()
      });
    }

    io.to(roomCode).emit('playerListUpdate', { roomCode, players: playersToEmit });
    io.emit('activeRoomsUpdate', getActiveRoomsSummary());

    // Send the player's answer history with detailed information (skip for spectators)
    if (!room.players[socket.id].isSpectator) {
      const playerAnswers = room.players[socket.id].answers || {};
      if (DEBUG_ENABLED) {
        console.log('[JOIN DEBUG] Sending answer history', {
          username: playerUsername,
          answersCount: Object.keys(playerAnswers).length,
          timestamp: new Date().toISOString()
        });
      }
      const answerHistory = Object.entries(playerAnswers).map(([questionIndex, choice]) => {
        const idx = parseInt(questionIndex);
        const question = room.quizData.questions[idx];
        const isRevealed = room.revealedQuestions && room.revealedQuestions.includes(idx);
        const isCorrect = isRevealed ? choice === question.correctChoice : null;

        const historyItem = {
          questionIndex: idx,
          choice,
          isRevealed,
          text: question.text,
          choices: question.choices
        };

        // Only include correctChoice and isCorrect for revealed questions
        if (isRevealed) {
          historyItem.correctChoice = question.correctChoice;
          historyItem.isCorrect = isCorrect;
        }

        return historyItem;
      });

      socket.emit('answerHistoryRestored', { answerHistory });
    }

    // If there's a current question active, send it to the new player
    if (room.currentQuestionIndex !== null) {
      const question = room.quizData.questions[room.currentQuestionIndex];
      const isRevealed = room.revealedQuestions && room.revealedQuestions.includes(room.currentQuestionIndex);

      // Include revealed status to prevent late joiners from answering revealed questions
      const questionData = {
        ...question,
        revealed: isRevealed,
        correctChoice: isRevealed ? question.correctChoice : undefined
      };

      socket.emit('questionPresented', { questionIndex: room.currentQuestionIndex, question: questionData });
      console.log(`Sent current question ${room.currentQuestionIndex} to ${playerDisplayName} (${playerUsername}) - Revealed: ${isRevealed}`);
    }
  });

  // Player connection state change
  socket.on('playerStateChange', ({ roomCode, username, state }) => {
    const room = roomService.liveRooms[roomCode];
    if (!room || !room.players[socket.id]) return;

    const player = room.players[socket.id];
    const oldState = player.connectionState;
    player.connectionState = state;

    // Only log significant state changes (not every away/connected toggle)
    // Log when: transitioning to/from disconnected, or when disconnecting
    const isSignificantChange = state === 'disconnected' || oldState === 'disconnected';
    if (isSignificantChange) {
      console.log(`[CONNECTION] ${player.name} (${username}) state changed: ${oldState} → ${state}`);
    }

    // Broadcast updated player list to all clients in the room
    io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players).filter(p => !p.isSpectator) });
  });

  // Presenter presents a question
  socket.on('presentQuestion', ({ roomCode, questionIndex }) => {
    const room = roomService.liveRooms[roomCode];
    if (!room) return;

    room.currentQuestionIndex = questionIndex;

    // Track this question as presented
    if (!room.presentedQuestions.includes(questionIndex)) {
      room.presentedQuestions.push(questionIndex);
    }

    // Start auto-save when first question is presented
    if (questionIndex === 0) {
      startAutoSave(roomCode);
    }

    // Reset current choice for players who haven't answered this question yet
    // If player already answered this question, restore their choice from history
    Object.values(room.players).forEach(p => {
      if (p.answers && p.answers[questionIndex] !== undefined) {
        // Player already answered this question - restore their choice
        p.choice = p.answers[questionIndex];
      } else {
        // Player hasn't answered yet - reset choice
        p.choice = null;
      }
    });

    const question = room.quizData.questions[questionIndex];
    io.to(roomCode).emit('questionPresented', { questionIndex, question, presentedQuestions: room.presentedQuestions });

    // Update player list to show reset choices
    io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players).filter(p => !p.isSpectator) });
  });

  // Player submits answer
  socket.on('submitAnswer', ({ roomCode, choice }) => {
    if (DEBUG_ENABLED) {
      console.log('[ANSWER DEBUG] submitAnswer received', {
        roomCode,
        choice,
        socketId: socket.id,
        timestamp: new Date().toISOString()
      });
    }

    const room = roomService.liveRooms[roomCode];
    if (!room) {
      if (DEBUG_ENABLED) {
        console.log('[ANSWER DEBUG] Room not found', {
          roomCode,
          socketId: socket.id,
          availableRooms: Object.keys(roomService.liveRooms)
        });
      }
      return;
    }

    if (room.currentQuestionIndex === null) {
      if (DEBUG_ENABLED) {
        console.log('[ANSWER DEBUG] No current question', {
          roomCode,
          socketId: socket.id
        });
      }
      return;
    }

    if (room.players[socket.id]) {
      const player = room.players[socket.id];

      if (DEBUG_ENABLED) {
        console.log('[ANSWER DEBUG] Player found in room', {
          username: player.username,
          displayName: player.name,
          socketId: socket.id,
          playerID: player.playerID,  // PHASE 2: Log PlayerID for debugging
          questionIndex: room.currentQuestionIndex,
          hasAnswers: !!player.answers,
          alreadyAnswered: player.answers?.[room.currentQuestionIndex] !== undefined,
          connected: player.connected,
          connectionState: player.connectionState
        });
      }

      // Check if player already answered this question (prevent re-answering)
      if (player.answers && player.answers[room.currentQuestionIndex] !== undefined) {
        console.log(`[ANSWER LOCK] ${player.name} tried to re-answer question ${room.currentQuestionIndex} (already answered with ${player.answers[room.currentQuestionIndex]})`);
        socket.emit('answerRejected', {
          message: 'You have already answered this question',
          questionIndex: room.currentQuestionIndex
        });
        return;
      }

      player.choice = choice;

      // Record answer in player's history
      if (!player.answers) player.answers = {};
      player.answers[room.currentQuestionIndex] = choice;

      // PHASE 3: Update RoomSessionID with answer data
      if (player.roomSessionID) {
        updateRoomSessionAnswer(player.roomSessionID, room.currentQuestionIndex, choice);
      }

      if (DEBUG_ENABLED) {
        console.log('[ANSWER DEBUG] Answer recorded successfully', {
          username: player.username,
          displayName: player.name,
          playerID: player.playerID,
          roomSessionID: player.roomSessionID,
          questionIndex: room.currentQuestionIndex,
          choice,
          totalAnswers: Object.keys(player.answers).length
        });
      }

      io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players).filter(p => !p.isSpectator) });

      console.log(`${player.name} answered question ${room.currentQuestionIndex} with choice ${choice}`);

      // Check if all active players have answered (connected + away, excluding disconnected)
      const activePlayers = Object.values(room.players).filter(
        p => !p.isSpectator && (p.connectionState === 'connected' || p.connectionState === 'away' || p.connectionState === 'warning')
      );
      const answeredPlayers = activePlayers.filter(
        p => p.answers && p.answers[room.currentQuestionIndex] !== undefined
      );

      if (activePlayers.length > 0 && answeredPlayers.length === activePlayers.length) {
        console.log(`[ALL ANSWERED] All ${activePlayers.length} active players have answered question ${room.currentQuestionIndex}`);
        io.to(roomCode).emit('allPlayersAnswered', {
          questionIndex: room.currentQuestionIndex,
          totalPlayers: activePlayers.length,
          timestamp: Date.now()
        });

        // Notify auto-mode service to skip remaining question timer
        if (room.autoMode) {
          autoModeService.onAllPlayersAnswered(roomCode);
        }
      }
    } else {
      if (DEBUG_ENABLED) {
        console.log('[ANSWER DEBUG] Player NOT found in room.players', {
          socketId: socket.id,
          roomCode,
          playersInRoom: Object.keys(room.players),
          timestamp: new Date().toISOString()
        });
      }
    }
  });

  // Presenter reveals answer
  socket.on('revealAnswer', ({ roomCode }) => {
    const room = roomService.liveRooms[roomCode];
    if (!room || room.currentQuestionIndex === null) return;

    const question = room.quizData.questions[room.currentQuestionIndex];

    // Track revealed questions
    if (!room.revealedQuestions.includes(room.currentQuestionIndex)) {
      room.revealedQuestions.push(room.currentQuestionIndex);
    }

    const results = Object.values(room.players)
      .filter(p => !p.isSpectator)
      .map(p => ({
        name: p.name,
        choice: p.choice,
        is_correct: p.choice === question.correctChoice
      }));

    io.to(roomCode).emit('questionRevealed', {
      questionIndex: room.currentQuestionIndex,
      question,
      results,
      revealedQuestions: room.revealedQuestions,
      answerDisplayTime: quizOptions.answerDisplayTime
    });
  });

  // Presenter completes quiz
  socket.on('completeQuiz', async ({ roomCode }) => {
    const room = roomService.liveRooms[roomCode];
    if (!room) return;

    room.status = 'completed';
    room.completedAt = new Date().toISOString();

    // Stop periodic auto-save (quiz is done)
    stopAutoSave(roomCode);

    // Save session if there are answers
    if (sessionHasAnswers(room)) {
      try {
        const filename = await saveSession(roomCode, room);
        console.log(`Session saved: ${filename}`);
        socket.emit('quizCompleted', { message: 'Quiz completed and saved!', filename });
      } catch (err) {
        console.error('Error saving session:', err);
        socket.emit('roomError', 'Failed to save quiz session.');
      }
    } else {
      socket.emit('quizCompleted', { message: 'Quiz completed (no answers recorded)' });
    }

    io.emit('activeRoomsUpdate', getActiveRoomsSummary());
  });

  // ---- Auto-Mode Controls ----

  // Start auto-mode for a room
  socket.on('startAutoMode', ({ roomCode, questionTimer, revealDelay }) => {
    const room = roomService.liveRooms[roomCode];
    if (!room) {
      socket.emit('roomError', 'Room not found');
      return;
    }

    // Validate presenter
    if (room.presenterId !== socket.id) {
      socket.emit('roomError', 'Only the presenter can control auto-mode');
      return;
    }

    autoModeService.startAutoMode(roomCode, {
      questionTimerSeconds: questionTimer || 30,
      revealDelaySeconds: revealDelay || 5
    });

    // Notify all clients in room
    io.to(roomCode).emit('autoModeStateChanged', {
      enabled: true,
      state: 'question_timer',
      questionTimer: questionTimer || 30,
      revealDelay: revealDelay || 5
    });
  });

  // Stop auto-mode for a room
  socket.on('stopAutoMode', ({ roomCode }) => {
    const room = roomService.liveRooms[roomCode];
    if (!room) return;

    if (room.presenterId !== socket.id) {
      socket.emit('roomError', 'Only the presenter can control auto-mode');
      return;
    }

    autoModeService.stopAutoMode(roomCode);

    io.to(roomCode).emit('autoModeStateChanged', {
      enabled: false,
      state: 'idle'
    });
  });

  // Pause auto-mode
  socket.on('pauseAutoMode', ({ roomCode }) => {
    const room = roomService.liveRooms[roomCode];
    if (!room) return;

    if (room.presenterId !== socket.id) {
      socket.emit('roomError', 'Only the presenter can control auto-mode');
      return;
    }

    autoModeService.pauseAutoMode(roomCode);
    const state = autoModeService.getState(roomCode);

    io.to(roomCode).emit('autoModeStateChanged', {
      enabled: true,
      state: 'paused',
      timeRemaining: state?.timeRemaining
    });
  });

  // Resume auto-mode
  socket.on('resumeAutoMode', ({ roomCode }) => {
    const room = roomService.liveRooms[roomCode];
    if (!room) return;

    if (room.presenterId !== socket.id) {
      socket.emit('roomError', 'Only the presenter can control auto-mode');
      return;
    }

    autoModeService.resumeAutoMode(roomCode);
    const state = autoModeService.getState(roomCode);

    // Calculate new timerStartedAt so clients can sync their timers
    // This represents when the timer would have started to give the remaining time
    const timerStartedAt = state?.timeRemaining
      ? new Date(Date.now() - ((state.questionTimerSeconds - state.timeRemaining) * 1000)).toISOString()
      : new Date().toISOString();

    io.to(roomCode).emit('autoModeStateChanged', {
      enabled: true,
      state: state?.state || 'question_timer',
      timeRemaining: state?.timeRemaining,
      timerStartedAt,
      timerDuration: state?.questionTimerSeconds
    });
  });

  // Close room
  socket.on('closeRoom', async ({ roomCode, userId, isRootAdmin }) => {
    const room = roomService.liveRooms[roomCode];
    if (!room) return;

    // Validate ownership: only room creator or root admin can close
    if (!isRootAdmin && room.createdBy && room.createdBy !== userId) {
      console.error(`[CLOSE] Access denied: User ${userId} cannot close room owned by ${room.createdBy}`);
      socket.emit('roomError', 'You can only close rooms you created');
      return;
    }

    // Stop periodic auto-save
    stopAutoSave(roomCode);

    // Clean up auto-mode timers
    autoModeService.cleanup(roomCode);

    // Auto-save if there are answers
    if (sessionHasAnswers(room)) {
      try {
        // Manual close: keep as in_progress unless already completed
        // (This allows the session to be resumed later)
        room.status = room.status === 'completed' ? 'completed' : 'in_progress';
        room.completedAt = room.status === 'completed' ? new Date().toISOString() : null;
        await saveSession(roomCode, room);
        console.log(`Session auto-saved before closing room ${roomCode} with status: ${room.status}`);
      } catch (err) {
        console.error('Error auto-saving session:', err);
      }
    }

    // PHASE 3: Clean up all RoomSessions for players in this room
    if (room.players) {
      for (const player of Object.values(room.players)) {
        if (player.roomSessionID) {
          deleteRoomSession(player.roomSessionID);
        }
      }
    }

    delete roomService.liveRooms[roomCode];
    io.to(roomCode).emit('roomClosed', { roomCode });
    io.socketsLeave(roomCode);
    console.log(`Room ${roomCode} closed.`);
    io.emit('activeRoomsUpdate', getActiveRoomsSummary());
  });

  // Kick player from room
  socket.on('kickPlayer', ({ roomCode, username }) => {
    const room = roomService.liveRooms[roomCode];
    if (!room) return;

    // Verify the requester is the presenter
    if (socket.id !== room.presenterId) {
      console.log(`Non-presenter ${socket.id} attempted to kick player from room ${roomCode}`);
      return;
    }

    // Find the player's socket ID
    const playerEntry = Object.entries(room.players).find(([_, player]) => player.name === username);
    if (!playerEntry) {
      console.log(`Player ${username} not found in room ${roomCode}`);
      return;
    }

    const [playerSocketId] = playerEntry;

    // Track kicked player with timestamp
    room.kickedPlayers[username] = Date.now();

    // Emit kicked event to the specific player
    io.to(playerSocketId).emit('player-kicked', {
      roomCode,
      message: 'You have been removed from this session by the presenter'
    });

    // Remove player from room
    delete room.players[playerSocketId];

    // Update player list for everyone
    io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players).filter(p => !p.isSpectator) });

    console.log(`Player ${username} kicked from room ${roomCode} by presenter`);
  });

  // Heartbeat mechanism to track connection health
  socket.on('heartbeat', ({ roomCode, username, timestamp }) => {
    const room = roomService.liveRooms[roomCode];
    if (!room || !room.players[socket.id]) return;

    const now = Date.now();
    room.players[socket.id].lastHeartbeat = now;

    // Calculate round-trip latency if timestamp provided
    const latency = timestamp ? now - timestamp : null;

    // Determine connection quality based on latency
    let connectionQuality = 'unknown';
    if (latency !== null) {
      if (latency < 100) {
        connectionQuality = 'excellent';
      } else if (latency < 300) {
        connectionQuality = 'good';
      } else if (latency < 500) {
        connectionQuality = 'fair';
      } else {
        connectionQuality = 'poor';
      }
    }

    // Respond with ack and latency data
    socket.emit('heartbeat-ack', {
      timestamp: now,
      latency: latency,
      connectionQuality: connectionQuality
    });

    // Log high latency connections for diagnostics
    if (latency && latency > 1000) {
      console.log(`[HEARTBEAT] High latency: ${room.players[socket.id].name} - ${latency}ms`);
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    // PHASE 2: Clean up PlayerID session tracking
    cleanupPlayerSession(socket.id);

    // PHASE 3: Mark RoomSessionID as disconnected (preserve data for reconnection)
    markRoomSessionDisconnected(socket.id);

    for (const [roomCode, room] of Object.entries(roomService.liveRooms)) {
      // Handle player disconnection
      if (room.players[socket.id]) {
        const playerName = room.players[socket.id].name;
        // Mark as disconnected instead of deleting
        room.players[socket.id].connected = false;
        room.players[socket.id].connectionState = 'disconnected';
        io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players).filter(p => !p.isSpectator) });
        io.emit('activeRoomsUpdate', getActiveRoomsSummary());
        console.log(`${playerName} disconnected from room ${roomCode}`);
      }

      // Handle presenter disconnection - just log it, don't close the room
      if (room.presenterId === socket.id) {
        console.log(`Presenter disconnected from room ${roomCode}. Reason: ${reason} (room continues)`);
        // Room persists independently - presenter can reconnect anytime
      }
    }
  });
});

// --------------------
// Helper: Active Room Summary (Phase 3: Using RoomService)
// --------------------
function getActiveRoomsSummary() {
  return roomService.getActiveRoomsSummary();
}

// --------------------
// Duplicate-Only Zombie Connection Cleanup
// --------------------
// PHILOSOPHY: Preserve ALL player data - only remove duplicate stale sockets
// - NO time-based removal (60s timeout removed)
// - ONLY removes duplicate connections (same username, multiple socket IDs)
// - Keeps ALL player data for presenter review (even if they left mid-quiz)
// Runs every 30 seconds to detect and remove duplicate stale connections
const ZOMBIE_CLEANUP_INTERVAL = 30000; // 30 seconds

setInterval(() => {
  let totalDuplicatesRemoved = 0;

  for (const [roomCode, room] of Object.entries(roomService.liveRooms)) {
    // Group players by username to detect duplicates
    const playersByUsername = {};

    for (const [socketId, player] of Object.entries(room.players)) {
      if (player.isSpectator) continue; // Skip spectators

      const username = player.username;
      if (!playersByUsername[username]) {
        playersByUsername[username] = [];
      }
      playersByUsername[username].push({ socketId, player });
    }

    // For each username with duplicates, keep only the active socket
    for (const [username, entries] of Object.entries(playersByUsername)) {
      if (entries.length <= 1) continue; // No duplicates - skip

      // Find the active socket (connected and valid)
      const activeEntry = entries.find(({ socketId, player }) => {
        const socket = io.sockets.sockets.get(socketId);
        return socket && socket.connected && player.connected;
      });

      // Remove ALL other sockets (duplicates/stale)
      for (const { socketId, player } of entries) {
        // Keep the active connection
        if (activeEntry && socketId === activeEntry.socketId) {
          continue; // Keep this one
        }

        // This is a duplicate/stale socket - remove it
        const socket = io.sockets.sockets.get(socketId);
        const socketDead = !socket || !socket.connected;

        if (socketDead || !player.connected) {
          if (VERBOSE_LOGGING) {
            console.log(`[ZOMBIE CLEANUP] Removing duplicate/stale socket for ${player.name} (${username}) from room ${roomCode}`);
          }
          delete room.players[socketId];
          totalDuplicatesRemoved++;
        }
      }
    }

    // Notify room if any duplicates were removed
    if (totalDuplicatesRemoved > 0) {
      io.to(roomCode).emit('playerListUpdate', {
        roomCode,
        players: Object.values(room.players).filter(p => !p.isSpectator)
      });
    }
  }

  if (totalDuplicatesRemoved > 0 && VERBOSE_LOGGING) {
    console.log(`[ZOMBIE CLEANUP] Total duplicate sockets removed across all rooms: ${totalDuplicatesRemoved}`);
  }
}, ZOMBIE_CLEANUP_INTERVAL);

// --------------------
// END OF LIVE ROOMS LOGIC
// --------------------


// ==================================================
// DEBUGGING & TESTING API
// ==================================================
// Debug API endpoints (debug mode detection and /debug route at top of file)
// ==================================================

if (DEBUG_ENABLED) {
  // --------------------
  // Debug: Get System State
  // --------------------
  app.get('/api/debug/state', (_req, res) => {
    const state = {
      liveRooms: Object.entries(roomService.liveRooms).map(([code, room]) => ({
        roomCode: code,
        quizTitle: room.quizData?.title,
        quizId: room.quizData?.id,
        players: Object.values(room.players).map(p => ({
          username: p.username,
          displayName: p.name,
          connected: p.connected,
          connectionState: p.connectionState,
          isSpectator: p.isSpectator,
          answersCount: Object.keys(p.answers || {}).length
        })),
        currentQuestionIndex: room.currentQuestionIndex,
        presentedQuestions: room.presentedQuestions,
        revealedQuestions: room.revealedQuestions,
        status: room.status,
        createdAt: room.createdAt
      })),
      totalRooms: Object.keys(roomService.liveRooms).length,
      totalPlayers: Object.values(roomService.liveRooms).reduce((sum, room) =>
        sum + Object.values(room.players).filter(p => !p.isSpectator).length, 0),
      serverUptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
    res.json(state);
  });

  // --------------------
  // Debug: Get Specific Room Details
  // --------------------
  app.get('/api/debug/room/:roomCode', (req, res) => {
    const { roomCode } = req.params;
    const room = roomService.liveRooms[roomCode];

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({
      roomCode,
      quizData: {
        id: room.quizData?.id,
        title: room.quizData?.title,
        description: room.quizData?.description,
        totalQuestions: room.quizData?.questions?.length
      },
      players: Object.entries(room.players).map(([socketId, player]) => ({
        socketId,
        username: player.username,
        displayName: player.name,
        userId: player.userId,
        connected: player.connected,
        connectionState: player.connectionState,
        isSpectator: player.isSpectator,
        currentChoice: player.choice,
        answers: player.answers
      })),
      currentQuestionIndex: room.currentQuestionIndex,
      presentedQuestions: room.presentedQuestions,
      revealedQuestions: room.revealedQuestions,
      status: room.status,
      createdAt: room.createdAt
    });
  });

  // --------------------
  // Debug: Create Test Room
  // --------------------
  app.post('/api/debug/create-test-room', async (req, res) => {
    try {
      const { quizId, roomCode } = req.body;

      // Use provided roomCode or generate a random one
      const finalRoomCode = roomCode || Math.random().toString(36).substring(2, 8).toUpperCase();

      // Check if room already exists
      if (roomService.liveRooms[finalRoomCode]) {
        return res.status(400).json({ error: 'Room code already exists' });
      }

      // Get quiz data
      let quiz;
      if (quizId) {
        quiz = await getQuizById(quizId);
        if (!quiz) {
          return res.status(404).json({ error: 'Quiz not found' });
        }
      } else {
        // Get first available quiz
        const quizzes = await listQuizzesFromDB();
        if (quizzes.length === 0) {
          return res.status(400).json({ error: 'No quizzes available' });
        }
        quiz = await getQuizById(quizzes[0].id);
      }

      // Create room (debug endpoint - default to root admin)
      roomService.liveRooms[finalRoomCode] = {
        quizData: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          questions: quiz.questions.map(q => ({
            text: q.text,
            type: q.type || 'multiple_choice',
            imageUrl: q.imageUrl || null,
            imageType: q.imageType || null,
            choices: q.choices.map(c => c.text),
            correctChoice: q.choices.findIndex(c => c.isCorrect)
          })),
          answerDisplayTimeout: quiz.answerDisplayTimeout || 30
        },
        players: {},
        currentQuestionIndex: null,
        presentedQuestions: [],
        revealedQuestions: [],
        status: 'waiting',
        createdAt: new Date().toISOString(),
        createdBy: 1, // Debug endpoint defaults to root admin
      };

      res.json({
        success: true,
        roomCode: finalRoomCode,
        quizTitle: quiz.title,
        questionsCount: quiz.questions.length,
        message: `Test room ${finalRoomCode} created successfully`
      });

    } catch (error) {
      console.error('Debug: Error creating test room:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --------------------
  // Debug: Add Test Player to Room
  // --------------------
  app.post('/api/debug/add-test-player', async (req, res) => {
    try {
      const { roomCode, username, displayName, isSpectator } = req.body;

      if (!roomCode || !username) {
        return res.status(400).json({ error: 'roomCode and username are required' });
      }

      const room = roomService.liveRooms[roomCode];
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const finalDisplayName = displayName || username;
      const fakeSocketId = `debug_${username}_${Date.now()}`;

      // Create or get user in database
      let userId = null;
      try {
        const userResult = await pool.query(
          'SELECT id FROM users WHERE username = $1',
          [username]
        );

        if (userResult.rows.length > 0) {
          userId = userResult.rows[0].id;
        } else {
          const createResult = await pool.query(
            'INSERT INTO users (username, account_type, password_hash) VALUES ($1, $2, NULL) RETURNING id',
            [username, 'guest']
          );
          userId = createResult.rows[0].id;
        }
      } catch (err) {
        console.error('Debug: Error creating user:', err);
      }

      // Add player to room
      room.players[fakeSocketId] = {
        id: fakeSocketId,
        username,
        name: finalDisplayName,
        userId,
        choice: null,
        connected: true,
        connectionState: 'connected',
        answers: {},
        isSpectator: isSpectator || false
      };

      res.json({
        success: true,
        message: `Test player ${username} added to room ${roomCode}`,
        socketId: fakeSocketId,
        playersCount: Object.keys(room.players).length
      });

    } catch (error) {
      console.error('Debug: Error adding test player:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --------------------
  // Debug: Simulate Answer Submission
  // --------------------
  app.post('/api/debug/submit-answer', (req, res) => {
    try {
      const { roomCode, username, choice } = req.body;

      if (!roomCode || username === undefined || choice === undefined) {
        return res.status(400).json({ error: 'roomCode, username, and choice are required' });
      }

      const room = roomService.liveRooms[roomCode];
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      // Find player by username
      const playerEntry = Object.entries(room.players).find(([, p]) => p.username === username);
      if (!playerEntry) {
        return res.status(404).json({ error: 'Player not found in room' });
      }

      const [, player] = playerEntry;

      // Check if question is presented
      if (room.currentQuestionIndex === null) {
        return res.status(400).json({ error: 'No question is currently presented' });
      }

      // Check if already revealed
      if (room.revealedQuestions?.includes(room.currentQuestionIndex)) {
        return res.status(400).json({ error: 'Question already revealed' });
      }

      // Submit answer
      player.choice = choice;
      if (!player.answers) {
        player.answers = {};
      }
      player.answers[room.currentQuestionIndex] = choice;

      res.json({
        success: true,
        message: `Answer ${choice} submitted for player ${username}`,
        questionIndex: room.currentQuestionIndex,
        choice
      });

    } catch (error) {
      console.error('Debug: Error submitting answer:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --------------------
  // Debug: Present Question
  // --------------------
  app.post('/api/debug/present-question', (req, res) => {
    try {
      const { roomCode, questionIndex } = req.body;

      if (!roomCode || questionIndex === undefined) {
        return res.status(400).json({ error: 'roomCode and questionIndex are required' });
      }

      const room = roomService.liveRooms[roomCode];
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      if (questionIndex < 0 || questionIndex >= room.quizData.questions.length) {
        return res.status(400).json({ error: 'Invalid question index' });
      }

      // Reset player choices
      Object.values(room.players).forEach(player => {
        player.choice = null;
      });

      room.currentQuestionIndex = questionIndex;

      if (!room.presentedQuestions.includes(questionIndex)) {
        room.presentedQuestions.push(questionIndex);
      }

      const question = room.quizData.questions[questionIndex];

      res.json({
        success: true,
        message: `Question ${questionIndex} presented`,
        questionIndex,
        questionText: question.text,
        choices: question.choices
      });

    } catch (error) {
      console.error('Debug: Error presenting question:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --------------------
  // Debug: Reveal Answer
  // --------------------
  app.post('/api/debug/reveal-answer', (req, res) => {
    try {
      const { roomCode } = req.body;

      if (!roomCode) {
        return res.status(400).json({ error: 'roomCode is required' });
      }

      const room = roomService.liveRooms[roomCode];
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }

      if (room.currentQuestionIndex === null) {
        return res.status(400).json({ error: 'No question is currently presented' });
      }

      const questionIndex = room.currentQuestionIndex;
      const question = room.quizData.questions[questionIndex];

      if (!room.revealedQuestions.includes(questionIndex)) {
        room.revealedQuestions.push(questionIndex);
      }

      // Calculate results
      const results = Object.values(room.players)
        .filter(p => !p.isSpectator)
        .map(player => ({
          username: player.username,
          displayName: player.name,
          choice: player.choice,
          isCorrect: player.choice === question.correctChoice
        }));

      res.json({
        success: true,
        message: `Answer revealed for question ${questionIndex}`,
        questionIndex,
        correctChoice: question.correctChoice,
        results
      });

    } catch (error) {
      console.error('Debug: Error revealing answer:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --------------------
  // Debug: Clean Up Test Data
  // --------------------
  app.post('/api/debug/cleanup', async (req, res) => {
    try {
      const { roomCode, deleteRooms, deleteTestUsers } = req.body;
      const results = {
        roomsDeleted: 0,
        sessionsDeleted: 0,
        usersDeleted: 0
      };

      // Delete specific room if roomCode provided
      if (roomCode && roomService.liveRooms[roomCode]) {
        // Stop auto-save if running
        if (autoSaveIntervals.has(roomCode)) {
          clearInterval(autoSaveIntervals.get(roomCode));
          autoSaveIntervals.delete(roomCode);
        }

        // PHASE 3: Clean up RoomSessions for specific room
        const room = roomService.liveRooms[roomCode];
        if (room && room.players) {
          for (const player of Object.values(room.players)) {
            if (player.roomSessionID) {
              deleteRoomSession(player.roomSessionID);
            }
          }
        }

        // Delete from memory
        delete roomService.liveRooms[roomCode];
        results.roomsDeleted = 1;

        // Delete completed session from database
        try {
          const deleteSession = await pool.query(
            'DELETE FROM completed_sessions WHERE room_code = $1 RETURNING id',
            [roomCode]
          );
          results.sessionsDeleted = deleteSession.rowCount;
        } catch (dbErr) {
          console.error('Debug: Error deleting session from database:', dbErr);
        }
      }

      // Delete all live rooms (if explicitly requested)
      if (deleteRooms) {
        const roomCount = Object.keys(roomService.liveRooms).length;

        // Clear all auto-save intervals
        autoSaveIntervals.forEach((interval) => {
          clearInterval(interval);
        });
        autoSaveIntervals.clear();

        // PHASE 3: Clean up all RoomSessions before deleting rooms
        Object.values(roomService.liveRooms).forEach(room => {
          if (room.players) {
            Object.values(room.players).forEach(player => {
              if (player.roomSessionID) {
                deleteRoomSession(player.roomSessionID);
              }
            });
          }
        });

        // Clear all rooms
        Object.keys(roomService.liveRooms).forEach(code => {
          delete roomService.liveRooms[code];
        });

        results.roomsDeleted = roomCount;
      }

      // Delete test users (all automated test user prefixes)
      if (deleteTestUsers) {
        const deleteResult = await pool.query(
          `DELETE FROM users
           WHERE username LIKE 'test%'
              OR username LIKE 'debug%'
              OR username LIKE 'player%'
              OR username LIKE 'user%'
              OR username LIKE 'demo%'
           RETURNING id`
        );
        results.usersDeleted = deleteResult.rowCount;
      }

      console.log(`[DEBUG CLEANUP] Deleted ${results.roomsDeleted} room(s), ${results.sessionsDeleted} session(s), ${results.usersDeleted} user(s)`);

      res.json({
        success: true,
        message: 'Cleanup completed',
        ...results
      });

    } catch (error) {
      console.error('Debug: Error during cleanup:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --------------------
  // Debug: Run Automated Test Scenario
  // --------------------
  app.post('/api/debug/run-test-scenario', async (req, res) => {
    try {
      const { scenario } = req.body;
      const results = { steps: [], success: true };

      if (scenario === 'basic-quiz-flow') {
        // Scenario: Create room, add players, present question, submit answers, reveal

        // Step 1: Create test room
        const quizzes = await listQuizzesFromDB();
        if (quizzes.length === 0) {
          return res.status(400).json({ error: 'No quizzes available for testing' });
        }

        const quiz = await getQuizById(quizzes[0].id);
        const roomCode = 'TEST' + Math.random().toString(36).substring(2, 6).toUpperCase();

        roomService.liveRooms[roomCode] = {
          quizData: {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            questions: quiz.questions.map(q => ({
              text: q.text,
              type: q.type || 'multiple_choice',
              imageUrl: q.imageUrl || null,
              imageType: q.imageType || null,
              choices: q.choices.map(c => c.text),
              correctChoice: q.choices.findIndex(c => c.isCorrect)
            })),
            answerDisplayTimeout: quiz.answerDisplayTimeout || 30
          },
          players: {},
          currentQuestionIndex: null,
          presentedQuestions: [],
          revealedQuestions: [],
          status: 'waiting',
          createdAt: new Date().toISOString()
        };
        results.steps.push({ step: 'create-room', roomCode, success: true });

        // Step 2: Add test players
        const testPlayers = ['testPlayer1', 'testPlayer2', 'testPlayer3'];
        for (const username of testPlayers) {
          const fakeSocketId = `debug_${username}_${Date.now()}`;
          roomService.liveRooms[roomCode].players[fakeSocketId] = {
            id: fakeSocketId,
            username,
            name: username,
            userId: null,
            choice: null,
            connected: true,
            connectionState: 'connected',
            answers: {},
            isSpectator: false
          };
        }
        results.steps.push({ step: 'add-players', count: testPlayers.length, success: true });

        // Step 3: Present first question
        roomService.liveRooms[roomCode].currentQuestionIndex = 0;
        roomService.liveRooms[roomCode].presentedQuestions.push(0);
        results.steps.push({ step: 'present-question', questionIndex: 0, success: true });

        // Step 4: Submit random answers
        const question = roomService.liveRooms[roomCode].quizData.questions[0];
        Object.values(roomService.liveRooms[roomCode].players).forEach(player => {
          const randomChoice = Math.floor(Math.random() * question.choices.length);
          player.choice = randomChoice;
          player.answers[0] = randomChoice;
        });
        results.steps.push({ step: 'submit-answers', count: testPlayers.length, success: true });

        // Step 5: Reveal answer
        roomService.liveRooms[roomCode].revealedQuestions.push(0);
        const correctAnswers = Object.values(roomService.liveRooms[roomCode].players).filter(
          p => p.choice === question.correctChoice
        ).length;
        results.steps.push({
          step: 'reveal-answer',
          correctAnswers,
          totalPlayers: testPlayers.length,
          success: true
        });

        results.roomCode = roomCode;
        results.message = 'Basic quiz flow test completed successfully';

      } else {
        return res.status(400).json({ error: 'Unknown scenario' });
      }

      res.json(results);

    } catch (error) {
      console.error('Debug: Error running test scenario:', error);
      res.status(500).json({ error: error.message, success: false });
    }
  });

  // --------------------
  // Debug: User Management - List All Users
  // --------------------
  app.get('/api/debug/users', async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id,
          username,
          account_type,
          password_hash IS NOT NULL as has_password,
          created_at,
          updated_at
        FROM users
        ORDER BY created_at DESC
      `);

      res.json({
        success: true,
        users: result.rows,
        totalUsers: result.rows.length
      });
    } catch (error) {
      console.error('Debug: Error listing users:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --------------------
  // Debug: User Management - Get User Details
  // --------------------
  app.get('/api/debug/user/:username', async (req, res) => {
    try {
      const { username } = req.params;

      const userResult = await pool.query(`
        SELECT
          id,
          username,
          account_type,
          password_hash,
          password_hash IS NOT NULL as has_password,
          LENGTH(password_hash) as password_hash_length,
          created_at,
          updated_at
        FROM users
        WHERE username = $1
      `, [username]);

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // Get user sessions
      const sessionsResult = await pool.query(`
        SELECT token, expires_at, created_at
        FROM user_sessions
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [user.id]);

      res.json({
        success: true,
        user: {
          ...user,
          password_hash: user.password_hash ? '[REDACTED - Length: ' + user.password_hash_length + ']' : null
        },
        sessions: sessionsResult.rows
      });
    } catch (error) {
      console.error('Debug: Error getting user details:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --------------------
  // Debug: User Management - Reset Password
  // --------------------
  app.post('/api/debug/reset-password', async (req, res) => {
    try {
      const { username, newPassword } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'username is required' });
      }

      // Get user
      const userResult = await pool.query(
        'SELECT id, username, account_type FROM users WHERE username = $1',
        [username]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      if (newPassword) {
        // Set new password
        const bcrypt = await import('bcrypt');
        const passwordHash = await bcrypt.hash(newPassword, 10);

        await pool.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [passwordHash, user.id]
        );

        // Invalidate all sessions
        await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [user.id]);

        res.json({
          success: true,
          message: `Password set for user ${username}`,
          sessionsInvalidated: true
        });
      } else {
        // Clear password (set to NULL)
        await pool.query(
          'UPDATE users SET password_hash = NULL, updated_at = NOW() WHERE id = $1',
          [user.id]
        );

        // Invalidate all sessions
        await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [user.id]);

        res.json({
          success: true,
          message: `Password cleared for user ${username} (requires password reset on next login)`,
          sessionsInvalidated: true
        });
      }
    } catch (error) {
      console.error('Debug: Error resetting password:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --------------------
  // Debug: User Management - Create Test User
  // --------------------
  app.post('/api/debug/create-user', async (req, res) => {
    try {
      const { username, password, accountType } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'username is required' });
      }

      // Check if user exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      let passwordHash = null;
      if (password) {
        const bcrypt = await import('bcrypt');
        passwordHash = await bcrypt.hash(password, 10);
      }

      const result = await pool.query(
        'INSERT INTO users (username, account_type, password_hash) VALUES ($1, $2, $3) RETURNING id, username, account_type',
        [username, accountType || 'guest', passwordHash]
      );

      res.json({
        success: true,
        message: `User ${username} created`,
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Debug: Error creating user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --------------------
  // Debug: User Management - Delete User
  // --------------------
  app.delete('/api/debug/user/:username', async (req, res) => {
    try {
      const { username } = req.params;

      // Don't allow deleting admin
      if (username === 'admin') {
        return res.status(403).json({ error: 'Cannot delete admin user' });
      }

      const result = await pool.query(
        'DELETE FROM users WHERE username = $1 RETURNING id, username',
        [username]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        success: true,
        message: `User ${username} deleted`,
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Debug: Error deleting user:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --------------------
  // Debug: User Management - Check Password Reset Flow
  // --------------------
  app.post('/api/debug/test-password-reset', async (req, res) => {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'username is required' });
      }

      // Get user
      const userResult = await pool.query(
        'SELECT id, username, account_type, password_hash FROM users WHERE username = $1',
        [username]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];
      const tests = [];

      // Test 1: Check current password state
      tests.push({
        test: 'Password Hash State',
        passed: true,
        result: user.password_hash ? `Has password (length: ${user.password_hash.length})` : 'No password (NULL)'
      });

      // Test 2: Try to clear password
      await pool.query(
        'UPDATE users SET password_hash = NULL WHERE id = $1',
        [user.id]
      );
      tests.push({
        test: 'Clear Password',
        passed: true,
        result: 'Password set to NULL'
      });

      // Test 3: Verify password is NULL
      const verifyResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [user.id]
      );
      tests.push({
        test: 'Verify Password Cleared',
        passed: verifyResult.rows[0].password_hash === null,
        result: verifyResult.rows[0].password_hash === null ? 'Password is NULL' : 'ERROR: Password not NULL!'
      });

      // Test 4: Invalidate sessions
      const deleteResult = await pool.query(
        'DELETE FROM user_sessions WHERE user_id = $1 RETURNING token',
        [user.id]
      );
      tests.push({
        test: 'Invalidate Sessions',
        passed: true,
        result: `${deleteResult.rowCount} sessions deleted`
      });

      // Test 5: Set a new password
      const bcrypt = await import('bcrypt');
      const testPassword = 'test123';
      const newHash = await bcrypt.hash(testPassword, 10);
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newHash, user.id]
      );
      tests.push({
        test: 'Set New Password',
        passed: true,
        result: 'New password hash created'
      });

      // Test 6: Verify new password works
      const finalResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [user.id]
      );
      const passwordMatches = await bcrypt.compare(testPassword, finalResult.rows[0].password_hash);
      tests.push({
        test: 'Verify New Password',
        passed: passwordMatches,
        result: passwordMatches ? 'Password verification successful' : 'ERROR: Password verification failed!'
      });

      const allPassed = tests.every(t => t.passed);

      res.json({
        success: allPassed,
        message: allPassed ? 'All password reset tests passed' : 'Some tests failed',
        tests,
        user: {
          id: user.id,
          username: user.username,
          accountType: user.account_type
        }
      });
    } catch (error) {
      console.error('Debug: Error testing password reset:', error);
      res.status(500).json({ error: error.message });
    }
  });

} else {
  console.log('🔒 Debug mode DISABLED - Set NODE_ENV=development to enable debug endpoints');
}


// --------------------
// Initialize Admin Password on Startup
// --------------------
async function initializeAdminPassword() {
  if (!ADMIN_PASSWORD) {
    console.log('⚠️  ADMIN_PASSWORD not set - admin login will not work');
    return;
  }

  try {
    // Check if admin user exists
    const adminResult = await pool.query(
      "SELECT id, password_hash FROM users WHERE username = 'admin'"
    );

    if (adminResult.rows.length === 0) {
      console.log('ℹ️  No admin user found in database - will be created by init scripts');
      return;
    }

    const admin = adminResult.rows[0];

    // Check if password hash is the placeholder or NULL
    const needsUpdate = !admin.password_hash || admin.password_hash.startsWith('$2b$10$rKzF5EqZQZZ');

    if (needsUpdate) {
      console.log('🔐 Updating admin password from environment variable...');

      // Import bcrypt dynamically
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE username = $2',
        [passwordHash, 'admin']
      );

      console.log('✅ Admin password updated successfully');
    } else {
      console.log('✅ Admin password already configured');
    }
  } catch (err) {
    // If bcrypt is not installed yet, skip this step
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      console.log('⚠️  bcrypt not installed yet - admin password will be set after npm install');
    } else {
      console.error('❌ Error initializing admin password:', err.message);
    }
  }
}

// --------------------
// SPA Routing Fallback (MUST BE LAST!)
// --------------------
// For any non-API, non-debug request that doesn't match a static file,
// serve index.html so Vue Router can handle client-side routing
app.use((req, res, next) => {
  // Skip API routes - let them 404 if not found
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Skip debug route if debug mode is enabled (already handled above)
  if (req.path === '/debug' && (process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true')) {
    return next();
  }
  // For all other routes, serve index.html (SPA routing)
  res.sendFile(path.join(distPath, 'index.html'));
});

// --------------------
// Start Server
// --------------------
(async () => {
  // Initialize database schema if needed (runs SQL files from app/init/)
  await initializeDatabase(pool);

  // Load quiz options from database
  await loadQuizOptions();

  // Update admin password from environment variable
  await initializeAdminPassword();

  // Initialize auto-mode service
  autoModeService.initialize(io, roomService, pool, quizOptions);

  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();