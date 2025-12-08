import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import QRCode from 'qrcode';
import os from 'os';
import xlsx from 'xlsx';
import multer from 'multer';
import ExcelJS from 'exceljs';
import pkg from 'pg';
const { Pool } = pkg;
import { initializeDatabase } from './db-init.js';

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

// Load .env file from root directory (for both Docker and local development)
// When running locally, looks for .env in parent directory
// When running in Docker, environment variables are passed via docker-compose.yml
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

// --------------------
// Debug Mode Detection (MUST BE FIRST)
// --------------------
const DEBUG_ENABLED = process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true';

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
  console.log('✅ PostgreSQL client connected to pool');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err);
});

// Database connection and initialization happens in db-init.js
// No early connection test here to avoid confusing timeout errors

// --------------------
// Database Helper Functions
// --------------------

/**
 * Fetch a complete quiz by ID with all questions and answers
 * @param {number} quizId - The quiz ID to fetch
 * @returns {Promise<Object>} Quiz object with questions and answers
 */
const getQuizById = async (quizId) => {
  const client = await pool.connect();
  try {
    // Fetch quiz metadata
    const quizResult = await client.query(
      'SELECT id, title, description, answer_display_timeout, created_at FROM quizzes WHERE id = $1 AND is_active = TRUE',
      [quizId]
    );

    if (quizResult.rows.length === 0) {
      return null;
    }

    const quiz = quizResult.rows[0];

    // Fetch questions with answers (using the view for convenience)
    const questionsResult = await client.query(`
      SELECT
        question_id,
        question_text,
        question_type,
        question_order,
        answer_id,
        answer_text,
        is_correct,
        display_order
      FROM quiz_full_details
      WHERE quiz_id = $1
      ORDER BY question_order, display_order
    `, [quizId]);

    // Group answers by question
    const questionsMap = new Map();
    for (const row of questionsResult.rows) {
      if (!questionsMap.has(row.question_id)) {
        questionsMap.set(row.question_id, {
          id: row.question_id,
          text: row.question_text,
          type: row.question_type,
          order: row.question_order,
          choices: []
        });
      }
      questionsMap.get(row.question_id).choices.push({
        id: row.answer_id,
        text: row.answer_text,
        isCorrect: row.is_correct,
        order: row.display_order
      });
    }

    // Convert map to array sorted by question_order
    const questions = Array.from(questionsMap.values())
      .sort((a, b) => a.order - b.order);

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      answerDisplayTimeout: quiz.answer_display_timeout,
      createdAt: quiz.created_at,
      questions
    };
  } finally {
    client.release();
  }
};

/**
 * List all active quizzes (basic info only)
 * @returns {Promise<Array>} Array of quiz objects
 */
const listQuizzesFromDB = async () => {
  const result = await pool.query(`
    SELECT
      q.id,
      q.title,
      q.description,
      q.created_at,
      COUNT(qq.question_id) as question_count
    FROM quizzes q
    LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
    WHERE q.is_active = TRUE
    GROUP BY q.id, q.title, q.description, q.created_at
    ORDER BY q.created_at DESC
  `);

  return result.rows;
};

// Sample query test moved to after database initialization

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
  }
});

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
// Helper: list completed sessions from database
// --------------------
const listCompletedSessions = async () => {
  try {
    const result = await pool.query(`
      SELECT
        gs.id,
        gs.room_code,
        gs.status,
        gs.created_at,
        gs.completed_at,
        gs.original_session_id,
        q.title as quiz_title,
        COUNT(DISTINCT CASE WHEN gp.display_name != 'Spectator Display' THEN gp.id END) as player_count,
        COUNT(DISTINCT sq.id) as question_count,
        COUNT(DISTINCT CASE WHEN sq.is_presented THEN sq.id END) as presented_count
      FROM game_sessions gs
      JOIN quizzes q ON gs.quiz_id = q.id
      LEFT JOIN game_participants gp ON gs.id = gp.game_session_id
      LEFT JOIN session_questions sq ON gs.id = sq.game_session_id
      GROUP BY gs.id, gs.room_code, gs.status, gs.created_at, gs.completed_at, gs.original_session_id, q.title
      ORDER BY gs.created_at DESC
    `);

    return result.rows.map(row => ({
      session_id: row.id,
      room_code: row.room_code,
      quiz_title: row.quiz_title,
      status: row.status,
      created_at: row.created_at,
      completed_at: row.completed_at,
      resumed_at: row.original_session_id ? row.created_at : null, // If this is a resumed session, created_at is when it was resumed
      original_session_id: row.original_session_id,
      player_count: parseInt(row.player_count),
      question_count: parseInt(row.question_count),
      presented_count: parseInt(row.presented_count)
    }));
  } catch (err) {
    console.error('Error listing sessions from database:', err);
    return [];
  }
};

// --------------------
// Helper: save session to database
// --------------------
const saveSession = async (roomCode, room) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Insert or update game_sessions
    // For resumed sessions, use resumedAt as the created_at timestamp
    const sessionTimestamp = room.resumedAt || room.createdAt;

    const sessionResult = await client.query(`
      INSERT INTO game_sessions (
        quiz_id, room_code, status, current_question_index,
        created_at, completed_at, original_session_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (room_code) DO UPDATE SET
        status = $3,
        current_question_index = $4,
        completed_at = $6
      RETURNING id
    `, [
      room.quizId,
      roomCode,
      room.status || 'in_progress',
      room.currentQuestionIndex,
      sessionTimestamp,
      room.completedAt || null,
      room.originalSessionId || null
    ]);

    const sessionId = sessionResult.rows[0].id;

    // 2. Insert session_questions (track presented/revealed status)
    // Clear existing session questions first
    await client.query('DELETE FROM session_questions WHERE game_session_id = $1', [sessionId]);

    const presentedSet = new Set(room.presentedQuestions || []);
    const revealedSet = new Set(room.revealedQuestions || []);

    for (let i = 0; i < room.quizData.questions.length; i++) {
      const question = room.quizData.questions[i];
      const isPresented = presentedSet.has(i);
      const isRevealed = revealedSet.has(i);

      await client.query(`
        INSERT INTO session_questions (
          game_session_id, question_id, presentation_order,
          is_presented, is_revealed
        )
        VALUES ($1, $2, $3, $4, $5)
      `, [sessionId, question.id, i, isPresented, isRevealed]);
    }

    // 3. Insert game_participants and their answers
    // Clear existing participants first
    await client.query('DELETE FROM game_participants WHERE game_session_id = $1', [sessionId]);

    for (const player of Object.values(room.players)) {
      // Insert participant with user_id from guest/registered account
      const participantResult = await client.query(`
        INSERT INTO game_participants (
          user_id, game_session_id, display_name, score,
          is_connected, socket_id, joined_at, last_seen
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        player.userId || null, // user_id from guest or registered account
        sessionId,
        player.name,
        0, // score (calculated from correct answers)
        player.connected || false,
        player.id, // socket_id
        new Date(),
        new Date()
      ]);

      const participantId = participantResult.rows[0].id;

      // 4. Insert participant answers
      if (player.answers && typeof player.answers === 'object') {
        for (const [questionIndexStr, choiceIndex] of Object.entries(player.answers)) {
          const questionIndex = parseInt(questionIndexStr);
          const question = room.quizData.questions[questionIndex];

          if (question && question.id) {
            // Find the answer_id for this choice
            const answerResult = await client.query(`
              SELECT id, is_correct
              FROM answers
              WHERE question_id = $1 AND display_order = $2
            `, [question.id, choiceIndex]);

            if (answerResult.rows.length > 0) {
              const answer = answerResult.rows[0];

              await client.query(`
                INSERT INTO participant_answers (
                  participant_id, question_id, answer_id, is_correct, answered_at
                )
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (participant_id, question_id) DO NOTHING
              `, [
                participantId,
                question.id,
                answer.id,
                answer.is_correct,
                new Date()
              ]);
            }
          }
        }
      }
    }

    await client.query('COMMIT');

    console.log(`✅ Session ${roomCode} saved to database (session_id: ${sessionId})`);
    return sessionId.toString();

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error saving session to database:', err);
    throw err;
  } finally {
    client.release();
  }
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

const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const result = await pool.query(
      'SELECT us.token, us.user_id, u.username, u.account_type FROM user_sessions us JOIN users u ON us.user_id = u.id WHERE us.token = $1 AND us.expires_at > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    // Update last_used_at
    await pool.query(
      'UPDATE user_sessions SET last_used_at = NOW() WHERE token = $1',
      [token]
    );

    req.user = result.rows[0];
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

const requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, () => {
    if (req.user.account_type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

// --------------------
// Routes: Simple Authentication
// --------------------

// Simple password check
app.post('/api/auth/check', (req, res) => {
  const { password } = req.body;
  console.log('🔑 Auth attempt - Password provided:', password ? 'yes' : 'no');
  console.log('🔑 Expected password:', ADMIN_PASSWORD);
  
  if (password === ADMIN_PASSWORD) {
    console.log('✅ Auth successful');
    res.json({ success: true });
  } else {
    console.log('❌ Auth failed');
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
// Get quiz options (from database)
app.get('/api/options', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT setting_value FROM app_settings WHERE setting_key = 'answer_display_time'"
    );

    const answerDisplayTime = result.rows.length > 0
      ? parseInt(result.rows[0].setting_value)
      : 30;

    res.json({ answerDisplayTime });
  } catch (err) {
    console.error('Error fetching options:', err);
    res.json({ answerDisplayTime: 30 }); // Return default on error
  }
});

// Save quiz options (to database)
app.post('/api/options', requireAdmin, async (req, res) => {
  try {
    const { answerDisplayTime } = req.body;

    // Validate input
    if (!answerDisplayTime || answerDisplayTime < 5 || answerDisplayTime > 300) {
      return res.status(400).json({ error: 'Answer display time must be between 5 and 300 seconds' });
    }

    // Update or insert setting
    await pool.query(`
      INSERT INTO app_settings (setting_key, setting_value, description)
      VALUES ('answer_display_time', $1, 'Answer display timeout in seconds')
      ON CONFLICT (setting_key)
      DO UPDATE SET setting_value = $1, updated_at = CURRENT_TIMESTAMP
    `, [answerDisplayTime.toString()]);

    res.json({ success: true, options: req.body });
  } catch (err) {
    console.error('Error saving options:', err);
    res.status(500).json({ error: 'Failed to save options' });
  }
});

// --------------------
// Routes: Quiz CRUD
// --------------------

// Get all quizzes
// Get all quizzes (from database)
app.get('/api/quizzes', requireAdmin, async (req, res) => {
  try {
    const quizzes = await listQuizzesFromDB();
    // Format response to match expected structure for frontend
    const formatted = quizzes.map(q => ({
      id: q.id,
      filename: `quiz_${q.id}.json`, // For backward compatibility with frontend
      title: q.title,
      description: q.description,
      questionCount: parseInt(q.question_count),
      createdAt: q.created_at
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching quizzes:', err);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// Get single quiz (from database)
// Note: :filename param is actually the quiz ID (for backward compatibility)
// Format: quiz_123.json → extract ID 123
app.get('/api/quizzes/:filename', requireAdmin, async (req, res) => {
  try {
    // Extract quiz ID from filename format (quiz_123.json → 123)
    const filename = req.params.filename;
    const quizId = filename.includes('_')
      ? parseInt(filename.split('_')[1].replace('.json', ''))
      : parseInt(filename);

    if (isNaN(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID format' });
    }

    const quiz = await getQuizById(quizId);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Format response to match expected frontend structure
    const formatted = {
      filename: `quiz_${quiz.id}.json`,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions.map(q => ({
        id: q.id,
        text: q.text,
        choices: q.choices.map(c => c.text),
        correctChoice: q.choices.findIndex(c => c.isCorrect)
      }))
    };

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching quiz:', err);
    res.status(500).json({ error: 'Failed to fetch quiz' });
  }
});

// Create new quiz (in database)
app.post('/api/quizzes', requireAdmin, async (req, res) => {
  const { title, description, questions } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert quiz
    const quizResult = await client.query(
      'INSERT INTO quizzes (title, description, created_by) VALUES ($1, $2, $3) RETURNING id',
      [title, description, 1] // TODO: Use actual user ID from auth session
    );
    const quizId = quizResult.rows[0].id;

    // Insert each question with answers
    for (let i = 0; i < (questions || []).length; i++) {
      const q = questions[i];

      // Insert question
      const questionResult = await client.query(
        'INSERT INTO questions (question_text, question_type, created_by) VALUES ($1, $2, $3) RETURNING id',
        [q.text, 'multiple_choice', 1] // TODO: Use actual user ID
      );
      const questionId = questionResult.rows[0].id;

      // Link question to quiz
      await client.query(
        'INSERT INTO quiz_questions (quiz_id, question_id, question_order) VALUES ($1, $2, $3)',
        [quizId, questionId, i + 1]
      );

      // Insert answers
      for (let j = 0; j < (q.choices || []).length; j++) {
        const isCorrect = j === q.correctChoice;
        await client.query(
          'INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES ($1, $2, $3, $4)',
          [questionId, q.choices[j], isCorrect, j]
        );
      }
    }

    await client.query('COMMIT');

    // Return formatted response
    const filename = `quiz_${quizId}.json`;
    res.json({
      filename,
      id: quizId,
      title,
      description,
      questions: questions || []
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating quiz:', err);
    res.status(500).json({ error: 'Failed to create quiz' });
  } finally {
    client.release();
  }
});

// Update quiz (in database)
app.put('/api/quizzes/:filename', requireAdmin, async (req, res) => {
  const client = await pool.connect();

  try {
    // Extract quiz ID from filename
    const filename = req.params.filename;
    const quizId = filename.includes('_')
      ? parseInt(filename.split('_')[1].replace('.json', ''))
      : parseInt(filename);

    if (isNaN(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID format' });
    }

    const { title, description, questions } = req.body;
    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'Questions must be an array' });
    }

    await client.query('BEGIN');

    // Update quiz metadata
    await client.query(
      'UPDATE quizzes SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [title, description, quizId]
    );

    // Get list of questions currently associated with this quiz
    const oldQuestionsResult = await client.query(
      'SELECT question_id FROM quiz_questions WHERE quiz_id = $1',
      [quizId]
    );
    const oldQuestionIds = oldQuestionsResult.rows.map(row => row.question_id);

    // Delete quiz-question relationships first
    await client.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]);

    // Try to delete old questions that are NOT referenced by session_questions
    // (Questions used in sessions will be preserved for historical data)
    if (oldQuestionIds.length > 0) {
      await client.query(`
        DELETE FROM questions
        WHERE id = ANY($1::int[])
        AND NOT EXISTS (
          SELECT 1 FROM session_questions WHERE question_id = questions.id
        )
      `, [oldQuestionIds]);
    }

    // Insert new questions with answers
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // Insert question
      const questionResult = await client.query(
        'INSERT INTO questions (question_text, question_type, created_by) VALUES ($1, $2, $3) RETURNING id',
        [q.text, 'multiple_choice', 1] // TODO: Use actual user ID
      );
      const questionId = questionResult.rows[0].id;

      // Link question to quiz
      await client.query(
        'INSERT INTO quiz_questions (quiz_id, question_id, question_order) VALUES ($1, $2, $3)',
        [quizId, questionId, i + 1]
      );

      // Insert answers
      for (let j = 0; j < (q.choices || []).length; j++) {
        const isCorrect = j === q.correctChoice;
        await client.query(
          'INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES ($1, $2, $3, $4)',
          [questionId, q.choices[j], isCorrect, j]
        );
      }
    }

    await client.query('COMMIT');

    // Return formatted response
    res.json({
      filename: `quiz_${quizId}.json`,
      id: quizId,
      title,
      description,
      questions
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating quiz:', err);
    res.status(500).json({ error: 'Failed to update quiz' });
  } finally {
    client.release();
  }
});

// Delete quiz (soft delete - sets is_active = false)
app.delete('/api/quizzes/:filename', requireAdmin, async (req, res) => {
  try {
    // Extract quiz ID from filename
    const filename = req.params.filename;
    const quizId = filename.includes('_')
      ? parseInt(filename.split('_')[1].replace('.json', ''))
      : parseInt(filename);

    if (isNaN(quizId)) {
      return res.status(400).json({ error: 'Invalid quiz ID format' });
    }

    // Soft delete: set is_active to false
    const result = await pool.query(
      'UPDATE quizzes SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [quizId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting quiz:', err);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});

// --------------------
// Routes: Excel Import/Export
// --------------------

// Download Excel template
app.get('/api/quiz-template', async (req, res) => {
  try {
    // Create a new workbook with ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Quiz');

    // Set column widths
    worksheet.columns = [
      { width: 40 }, // Question Text
      { width: 18 }, // Choice A
      { width: 18 }, // Choice B
      { width: 18 }, // Choice C
      { width: 18 }, // Choice D
      { width: 18 }, // Choice E
      { width: 18 }, // Choice F
      { width: 18 }, // Choice G
      { width: 18 }, // Choice H
      { width: 18 }, // Choice I
      { width: 18 }, // Choice J
      { width: 30 }  // Correct Answer
    ];

    // Row 1: Quiz Title (label + editable)
    worksheet.getRow(1).values = ['Quiz Title', 'My Quiz Title'];
    worksheet.getCell('A1').font = { bold: true };
    worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } }; // Light green
    worksheet.getCell('B1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // White (editable)
    worksheet.getCell('B1').border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    // Row 2: Description (label + editable)
    worksheet.getRow(2).values = ['Description', 'Description of the quiz'];
    worksheet.getCell('A2').font = { bold: true };
    worksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } }; // Light green
    worksheet.getCell('B2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // White (editable)
    worksheet.getCell('B2').border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

    // Row 3: Empty

    // Row 4: Index reference (reference only - light gray background)
    const indexRow = worksheet.getRow(4);
    indexRow.values = ['Index →', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '← Use these numbers'];
    indexRow.font = { bold: true, color: { argb: 'FF666666' } };
    indexRow.alignment = { horizontal: 'center' };
    for (let col = 1; col <= 12; col++) {
      const cell = worksheet.getCell(4, col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }; // Light gray
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }

    // Row 5: Column headers (reference only - blue background)
    const headerRow = worksheet.getRow(5);
    headerRow.values = ['Question Text', 'Choice A', 'Choice B', 'Choice C', 'Choice D', 'Choice E', 'Choice F', 'Choice G', 'Choice H', 'Choice I', 'Choice J', 'Correct Answer (0-based index)'];
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }; // White text
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let col = 1; col <= 12; col++) {
      const cell = worksheet.getCell(5, col);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }; // Blue
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    }

    // Sample questions (rows 6-9) - white background (editable)
    const sampleData = [
      ['What is 2+2?', '3', '4', '5', '6', '', '', '', '', '', '', '1'],
      ['What color is the sky?', 'Red', 'Blue', 'Green', 'Yellow', '', '', '', '', '', '', '1'],
      ['Sample question with 6 choices', 'Choice 1', 'Choice 2', 'Choice 3', 'Choice 4', 'Choice 5', 'Choice 6', '', '', '', '', '3'],
      ['Sample question with 10 choices', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', '9']
    ];

    for (let i = 0; i < sampleData.length; i++) {
      const row = worksheet.getRow(6 + i);
      row.values = sampleData[i];

      // Style each cell in the sample rows
      for (let col = 1; col <= 12; col++) {
        const cell = worksheet.getCell(6 + i, col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; // White
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

        // Center align the correct answer column
        if (col === 12) {
          cell.alignment = { horizontal: 'center' };
        }
      }
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Send file
    res.setHeader('Content-Disposition', 'attachment; filename="quiz_template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Error generating template:', err);
    res.status(500).json({ error: 'Failed to generate template' });
  }
});

// Import quiz from Excel
app.post('/api/import-quiz', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // Extract quiz metadata (first 2 rows)
    if (data.length < 6) {
      return res.status(400).json({ error: 'Invalid template format. Please use the provided template.' });
    }

    const title = data[0][1] || 'Untitled Quiz';
    const description = data[1][1] || '';

    // Extract questions (starting from row 5, after the index reference and header rows)
    const questions = [];
    for (let i = 5; i < data.length; i++) {
      const row = data[i];

      // Skip empty rows
      if (!row || !row[0]) continue;

      const questionText = row[0];
      const choices = [];

      // Collect all non-empty choices (columns 1-10)
      for (let j = 1; j <= 10; j++) {
        if (row[j] && row[j].toString().trim() !== '') {
          choices.push(row[j].toString());
        }
      }

      // Get correct answer index (column 11, since columns 1-10 are choices)
      const correctChoice = parseInt(row[11]);

      // Validate
      if (!questionText || choices.length < 2 || isNaN(correctChoice) || correctChoice < 0 || correctChoice >= choices.length) {
        return res.status(400).json({
          error: `Invalid question at row ${i + 1}: Must have question text, at least 2 choices, and valid correct answer index`
        });
      }

      // Create question object
      questions.push({
        text: questionText,
        choices: choices,
        correctChoice: correctChoice,
        id: `q_${Date.now()}_${Math.floor(Math.random() * 10000)}`
      });
    }

    if (questions.length === 0) {
      return res.status(400).json({ error: 'No valid questions found in the file' });
    }

    // Save quiz to database
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert quiz
      const quizResult = await client.query(
        'INSERT INTO quizzes (title, description, created_by) VALUES ($1, $2, $3) RETURNING id',
        [title, description, 1] // TODO: Use actual user ID from auth session
      );
      const quizId = quizResult.rows[0].id;

      // Insert each question with answers
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        // Insert question
        const questionResult = await client.query(
          'INSERT INTO questions (question_text, question_type, created_by) VALUES ($1, $2, $3) RETURNING id',
          [q.text, 'multiple_choice', 1] // TODO: Use actual user ID
        );
        const questionId = questionResult.rows[0].id;

        // Link question to quiz
        await client.query(
          'INSERT INTO quiz_questions (quiz_id, question_id, question_order) VALUES ($1, $2, $3)',
          [quizId, questionId, i + 1]
        );

        // Insert answers
        for (let j = 0; j < q.choices.length; j++) {
          const isCorrect = j === q.correctChoice;
          await client.query(
            'INSERT INTO answers (question_id, answer_text, is_correct, display_order) VALUES ($1, $2, $3, $4)',
            [questionId, q.choices[j], isCorrect, j]
          );
        }
      }

      await client.query('COMMIT');

      const filename = `quiz_${quizId}.json`;
      res.json({
        success: true,
        filename,
        id: quizId,
        title,
        questionCount: questions.length
      });
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error importing quiz:', err);
    res.status(500).json({ error: 'Failed to import quiz: ' + err.message });
  }
});

// --------------------
// Routes: Authentication
// --------------------

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // For now, import bcrypt dynamically (will be available after npm install)
    const bcrypt = await import('bcrypt');

    // Find user by username
    const userResult = await pool.query(
      'SELECT id, username, password_hash, account_type FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Check if password_hash exists (not a guest account)
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session token
    const sessionResult = await pool.query(
      `INSERT INTO user_sessions (user_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '${process.env.SESSION_TIMEOUT || 3600000} milliseconds')
       RETURNING token, expires_at`,
      [user.id]
    );

    const session = sessionResult.rows[0];

    res.json({
      token: session.token,
      user: {
        id: user.id,
        username: user.username,
        account_type: user.account_type
      },
      expires_at: session.expires_at
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    await pool.query('DELETE FROM user_sessions WHERE token = $1', [token]);

    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Player registration - upgrade guest account to player account
app.post('/api/auth/register-player', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const bcrypt = await import('bcrypt');

    // Check if username exists as guest
    const userResult = await pool.query(
      'SELECT id, account_type, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Guest account not found. Please join a game first.' });
    }

    const user = userResult.rows[0];

    // If already a player or admin with a password, return error
    // Allow if: guest account OR password was reset by admin (password_hash is NULL)
    if (user.account_type !== 'guest' && user.password_hash !== null) {
      return res.status(400).json({ error: 'This account is already registered' });
    }

    // If account already has a password, they're trying to register again
    if (user.password_hash) {
      return res.status(400).json({ error: 'This account already has a password' });
    }

    // Set password and ensure account is player type
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE users
       SET account_type = $1, password_hash = $2
       WHERE id = $3`,
      ['player', passwordHash, user.id]
    );

    // Create session token
    const sessionResult = await pool.query(
      `INSERT INTO user_sessions (user_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '${process.env.SESSION_TIMEOUT || 3600000} milliseconds')
       RETURNING token, expires_at`,
      [user.id]
    );

    const session = sessionResult.rows[0];

    console.log(`Guest user "${username}" upgraded to player account`);

    res.json({
      success: true,
      token: session.token,
      user: {
        id: user.id,
        username: username,
        account_type: 'player'
      },
      expires_at: session.expires_at
    });
  } catch (err) {
    console.error('Player registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Alias for guest registration (same as player registration)
app.post('/api/auth/register-guest', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const bcrypt = await import('bcrypt');

    // Check if username exists as guest
    const userResult = await pool.query(
      'SELECT id, account_type, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Guest account not found. Please join a game first.' });
    }

    const user = userResult.rows[0];

    // If already a player or admin with a password, return error
    // Allow if: guest account OR password was reset by admin (password_hash is NULL)
    if (user.account_type !== 'guest' && user.password_hash !== null) {
      return res.status(400).json({ error: 'This account is already registered' });
    }

    // If account already has a password, they're trying to register again
    if (user.password_hash) {
      return res.status(400).json({ error: 'This account already has a password' });
    }

    // Set password and ensure account is player type
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `UPDATE users
       SET account_type = $1, password_hash = $2
       WHERE id = $3`,
      ['player', passwordHash, user.id]
    );

    // Create session token
    const sessionResult = await pool.query(
      `INSERT INTO user_sessions (user_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '${process.env.SESSION_TIMEOUT || 3600000} milliseconds')
       RETURNING token, expires_at`,
      [user.id]
    );

    const session = sessionResult.rows[0];

    console.log(`Guest user "${username}" upgraded to player account`);

    res.json({
      success: true,
      token: session.token,
      user: {
        id: user.id,
        username: username,
        account_type: 'player'
      },
      expires_at: session.expires_at
    });
  } catch (err) {
    console.error('Player registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Get current user
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.user_id,
      username: req.user.username,
      account_type: req.user.account_type
    }
  });
});

// Check if username exists and requires authentication
app.post('/api/auth/check-username', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const result = await pool.query(
      'SELECT id, username, account_type FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      // Username doesn't exist - can be used as new guest
      return res.json({ exists: false, requiresAuth: false });
    }

    const user = result.rows[0];

    // If account is registered (player type), requires authentication
    if (user.account_type === 'player') {
      return res.json({
        exists: true,
        requiresAuth: true,
        accountType: 'player'
      });
    }

    // Guest account - can be used without auth
    return res.json({
      exists: true,
      requiresAuth: false,
      accountType: 'guest'
    });
  } catch (err) {
    console.error('Username check error:', err);
    res.status(500).json({ error: 'Failed to check username' });
  }
});

// Player login (for registered accounts)
app.post('/api/auth/player-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Import bcrypt dynamically
    const bcrypt = await import('bcrypt');

    // Find user
    const userResult = await pool.query(
      'SELECT id, username, password_hash, account_type FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Only allow registered players to login
    if (user.account_type !== 'player') {
      return res.status(403).json({ error: 'This account cannot login with a password' });
    }

    // Check if password needs to be reset (password_hash is NULL)
    if (user.password_hash === null) {
      return res.status(428).json({
        error: 'Password reset required',
        requiresPasswordReset: true,
        message: 'Your password has been reset by an administrator. Please set a new password.'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session token (let database generate UUID)
    const sessionResult = await pool.query(
      `INSERT INTO user_sessions (user_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '${process.env.SESSION_TIMEOUT || 3600000} milliseconds')
       RETURNING token, expires_at`,
      [user.id]
    );

    const token = sessionResult.rows[0].token;

    // Update last_seen (if column exists)
    await pool.query(
      'UPDATE users SET updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    console.log(`Player ${username} logged in successfully`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        accountType: user.account_type
      }
    });
  } catch (err) {
    console.error('Player login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Set new password after reset (for players with NULL password_hash)
app.post('/api/auth/set-new-password', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Import bcrypt dynamically
    const bcrypt = await import('bcrypt');

    // Find user
    const userResult = await pool.query(
      'SELECT id, username, password_hash, account_type FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Only allow registered players
    if (user.account_type !== 'player') {
      return res.status(403).json({ error: 'This account cannot set a password' });
    }

    // Check if password is in reset state (NULL)
    if (user.password_hash !== null) {
      return res.status(400).json({ error: 'Password is not in reset state. Use the login form instead.' });
    }

    // Hash the new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password in database
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, user.id]
    );

    // Create session token
    const sessionResult = await pool.query(
      `INSERT INTO user_sessions (user_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '${process.env.SESSION_TIMEOUT || 3600000} milliseconds')
       RETURNING token, expires_at`,
      [user.id]
    );

    const token = sessionResult.rows[0].token;

    console.log(`Player ${username} set new password after reset`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        accountType: user.account_type
      }
    });
  } catch (err) {
    console.error('Set new password error:', err);
    res.status(500).json({ error: 'Failed to set new password' });
  }
});

// Verify player token (for auto-login)
app.post('/api/auth/verify-player', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Check if session exists and is valid
    const sessionResult = await pool.query(
      `SELECT s.user_id, s.expires_at, u.username, u.account_type
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const session = sessionResult.rows[0];

    // Only allow player and admin accounts to auto-login
    if (session.account_type !== 'player' && session.account_type !== 'admin') {
      return res.status(403).json({ error: 'Account type not supported for auto-login' });
    }

    res.json({
      success: true,
      user: {
        id: session.user_id,
        username: session.username,
        account_type: session.account_type
      }
    });
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get all users (admin only)
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.account_type,
        u.created_at,
        COUNT(DISTINCT gp.game_session_id) as games_played,
        MAX(gs.created_at) as last_seen
      FROM users u
      LEFT JOIN game_participants gp ON u.id = gp.user_id
      LEFT JOIN game_sessions gs ON gp.game_session_id = gs.id
      WHERE u.account_type IN ('guest', 'player')
      GROUP BY u.id, u.username, u.account_type, u.created_at
      ORDER BY u.created_at DESC
    `);

    const users = result.rows.map(row => ({
      id: row.id,
      username: row.username,
      accountType: row.account_type,
      createdAt: row.created_at,
      gamesPlayed: parseInt(row.games_played),
      lastSeen: row.last_seen
    }));

    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent deleting admin users
    const userCheck = await pool.query(
      'SELECT account_type FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userCheck.rows[0].account_type === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }

    // Delete user and all associated data (cascading deletes handled by database)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    console.log(`User ${userId} deleted by admin`);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Downgrade user from player to guest (admin only)
app.post('/api/users/:userId/downgrade', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check user exists and is a player
    const userCheck = await pool.query(
      'SELECT account_type FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userCheck.rows[0].account_type !== 'player') {
      return res.status(400).json({ error: 'User is not a registered player' });
    }

    // Downgrade to guest (remove password, change account type)
    await pool.query(
      'UPDATE users SET account_type = $1, password_hash = NULL WHERE id = $2',
      ['guest', userId]
    );

    // Invalidate all user sessions
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

    console.log(`User ${userId} downgraded to guest by admin`);
    res.json({ success: true, message: 'User downgraded to guest successfully' });
  } catch (err) {
    console.error('Error downgrading user:', err);
    res.status(500).json({ error: 'Failed to downgrade user' });
  }
});

// Reset a user's password (admin only)
app.post('/api/users/:userId/reset-password', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check user exists and is a registered player
    const userCheck = await pool.query(
      'SELECT username, account_type FROM users WHERE id = $1',
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userCheck.rows[0].account_type !== 'player') {
      return res.status(400).json({ error: 'User is not a registered player' });
    }

    const username = userCheck.rows[0].username;

    // Reset password (set to NULL) - user will be prompted to set new password on next login
    await pool.query(
      'UPDATE users SET password_hash = NULL WHERE id = $1',
      [userId]
    );

    // Invalidate all user sessions
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

    console.log(`Password reset for user ${username} (ID: ${userId}) by admin`);
    res.json({ success: true, message: 'Password reset successfully. User will be prompted to set a new password on next login.' });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

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
app.post('/api/banned-names', requireAdmin, async (req, res) => {
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
app.delete('/api/banned-names/:id', requireAdmin, async (req, res) => {
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
    const activeRooms = roomCodes.filter(code => liveRooms[code] !== undefined);

    res.json({ activeRooms });
  } catch (err) {
    console.error('Error checking active rooms:', err);
    res.status(500).json({ error: 'Failed to check active rooms' });
  }
});

// Legacy password check endpoint (for backward compatibility with landing.html)
app.post('/api/auth/check', async (req, res) => {
  const { password } = req.body;

  // Simple comparison with environment variable for now
  // This will be replaced with proper login flow
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// --------------------
// Routes: Completed Sessions
// --------------------

// Get all completed sessions
app.get('/api/sessions', requireAdmin, async (req, res) => {
  const sessions = await listCompletedSessions();

  // Format for frontend compatibility
  const formatted = sessions.map(s => ({
    filename: `session_${s.session_id}.json`, // For backward compatibility
    sessionId: s.session_id,
    roomCode: s.room_code,
    quizTitle: s.quiz_title,
    status: s.status,
    createdAt: s.created_at,
    completedAt: s.completed_at,
    resumedAt: s.resumed_at || null,
    playerCount: s.player_count,
    questionCount: s.question_count,
    presentedCount: s.presented_count
  }));

  res.json(formatted);
});

// Get incomplete sessions only
app.get('/api/sessions/incomplete', requireAdmin, async (req, res) => {
  const sessions = await listCompletedSessions();
  const incomplete = sessions.filter(s => s.status !== 'completed');

  // Format for frontend compatibility
  const formatted = incomplete.map(s => ({
    filename: `session_${s.session_id}.json`, // For backward compatibility
    sessionId: s.session_id,
    roomCode: s.room_code,
    quizTitle: s.quiz_title,
    status: s.status,
    createdAt: s.created_at,
    completedAt: s.completed_at,
    resumedAt: s.resumed_at || null,
    playerCount: s.player_count,
    questionCount: s.question_count,
    presentedCount: s.presented_count
  }));

  res.json(formatted);
});

// Get completed sessions only
app.get('/api/sessions/completed', requireAdmin, async (req, res) => {
  const sessions = await listCompletedSessions();
  const completed = sessions.filter(s => s.status === 'completed');

  // Format for frontend compatibility
  const formatted = completed.map(s => ({
    filename: `session_${s.session_id}.json`, // For backward compatibility
    sessionId: s.session_id,
    roomCode: s.room_code,
    quizTitle: s.quiz_title,
    status: s.status,
    createdAt: s.created_at,
    completedAt: s.completed_at,
    resumedAt: s.resumed_at || null,
    playerCount: s.player_count,
    questionCount: s.question_count,
    presentedCount: s.presented_count
  }));

  res.json(formatted);
});

// Get single session (from database)
app.get('/api/sessions/:filename', requireAdmin, async (req, res) => {
  try {
    // Extract session ID from filename (session_123.json → 123) or use directly
    const sessionId = req.params.filename.includes('_')
      ? parseInt(req.params.filename.split('_')[1].replace('.json', ''))
      : parseInt(req.params.filename);

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    // Fetch session with all related data
    const sessionResult = await pool.query(`
      SELECT
        gs.id,
        gs.room_code,
        gs.status,
        gs.created_at,
        gs.completed_at,
        gs.original_session_id,
        q.id as quiz_id,
        q.title as quiz_title
      FROM game_sessions gs
      JOIN quizzes q ON gs.quiz_id = q.id
      WHERE gs.id = $1
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Fetch participants with their answers (excluding Spectator Display)
    const participantsResult = await pool.query(`
      SELECT
        gp.display_name,
        pa.question_id,
        pa.answer_id,
        sq.presentation_order,
        a.display_order as choice_index,
        pa.is_correct
      FROM game_participants gp
      LEFT JOIN participant_answers pa ON gp.id = pa.participant_id
      LEFT JOIN session_questions sq ON pa.question_id = sq.question_id AND sq.game_session_id = $1
      LEFT JOIN answers a ON pa.answer_id = a.id
      WHERE gp.game_session_id = $1 AND gp.display_name != 'Spectator Display'
      ORDER BY gp.display_name, sq.presentation_order
    `, [sessionId]);

    // Group answers by player and calculate statistics
    const playersMap = new Map();
    for (const row of participantsResult.rows) {
      if (!playersMap.has(row.display_name)) {
        playersMap.set(row.display_name, {
          name: row.display_name,
          answers: {},
          correct: 0,
          answered: 0
        });
      }
      const player = playersMap.get(row.display_name);
      if (row.question_id && row.presentation_order !== null) {
        player.answers[row.presentation_order] = row.choice_index;
        player.answered++;
        if (row.is_correct) {
          player.correct++;
        }
      }
    }

    // Fetch quiz questions with full details
    const questionsResult = await pool.query(`
      SELECT
        sq.presentation_order,
        sq.is_presented,
        sq.is_revealed,
        qs.question_text,
        qs.id as question_id
      FROM session_questions sq
      JOIN questions qs ON sq.question_id = qs.id
      WHERE sq.game_session_id = $1
      ORDER BY sq.presentation_order
    `, [sessionId]);

    const presentedQuestions = [];
    const revealedQuestions = [];
    const questions = [];

    for (const row of questionsResult.rows) {
      if (row.is_presented) presentedQuestions.push(row.presentation_order);
      if (row.is_revealed) revealedQuestions.push(row.presentation_order);

      // Fetch answers for this question
      const answersResult = await pool.query(`
        SELECT answer_text, is_correct, display_order
        FROM answers
        WHERE question_id = $1
        ORDER BY display_order
      `, [row.question_id]);

      const choices = answersResult.rows.map(a => a.answer_text);
      const correctChoice = answersResult.rows.findIndex(a => a.is_correct);

      questions.push({
        text: row.question_text,
        choices,
        correctChoice
      });
    }

    // Format response to match frontend expectations
    const playerResults = Array.from(playersMap.values());

    const response = {
      filename: `session_${session.id}.json`, // For deletion and backwards compatibility
      sessionId: session.id,
      roomCode: session.room_code,
      quizTitle: session.quiz_title,
      quizFilename: `quiz_${session.quiz_id}.json`,
      status: session.status,
      createdAt: session.created_at,
      completedAt: session.completed_at,
      originalRoomCode: session.original_session_id ? `Room ${session.original_session_id}` : null,
      presentedQuestions,
      revealedQuestions,
      questions,
      players: playerResults, // For backwards compatibility
      playerResults // With calculated statistics for modal
    };

    res.json(response);
  } catch (err) {
    console.error('Error fetching session:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Delete session (from database)
app.delete('/api/sessions/:filename', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    // Extract session ID from filename
    const sessionId = req.params.filename.includes('_')
      ? parseInt(req.params.filename.split('_')[1].replace('.json', ''))
      : parseInt(req.params.filename);

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    await client.query('BEGIN');

    // Delete child records first to avoid foreign key constraint violations
    // Delete participant answers
    await client.query(
      'DELETE FROM participant_answers WHERE participant_id IN (SELECT id FROM game_participants WHERE game_session_id = $1)',
      [sessionId]
    );

    // Delete participants
    await client.query(
      'DELETE FROM game_participants WHERE game_session_id = $1',
      [sessionId]
    );

    // Delete session questions
    await client.query(
      'DELETE FROM session_questions WHERE game_session_id = $1',
      [sessionId]
    );

    // Finally delete the session itself
    const result = await client.query(
      'DELETE FROM game_sessions WHERE id = $1 RETURNING id',
      [sessionId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Session not found' });
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting session:', err);
    res.status(500).json({ error: 'Failed to delete session', details: err.message });
  } finally {
    client.release();
  }
});

// Get player progress in current room
app.get('/api/player/progress/:roomCode', async (req, res) => {
  try {
    const { roomCode } = req.params;
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const room = liveRooms[roomCode];
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

    const room = liveRooms[roomCode];
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
          connected: player.connected
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
// Live Rooms Logic with Session Recording
// --------------------
const liveRooms = {}; // { roomCode: { quizFilename, quizId, quizData (from DB), players: {}, presenterId, currentQuestionIndex, presentedQuestions: [], status, createdAt } }
let quizOptions = { answerDisplayTime: 30 }; // Default options

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

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send active rooms immediately on connection
  socket.emit('activeRoomsUpdate', getActiveRoomsSummary());

  // Get active rooms (manual request)
  socket.on('getActiveRooms', () => {
    socket.emit('activeRoomsUpdate', getActiveRoomsSummary());
  });

  // Presenter creates a room
  socket.on('createRoom', async ({ roomCode, quizFilename }) => {
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
          choices: q.choices.map(c => c.text),
          correctChoice: q.choices.findIndex(c => c.isCorrect)
        }))
      };

      if (!liveRooms[roomCode]) {
        liveRooms[roomCode] = {
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
          createdAt: new Date().toISOString()
        };
        console.log(`Room ${roomCode} created for quiz ID ${quizId} (${quiz.title})`);
      }

      socket.join(roomCode);
      socket.emit('roomCreated', {
        roomCode,
        quizTitle: quizData.title,
        questions: quizData.questions,
        presentedQuestions: liveRooms[roomCode].presentedQuestions,
        revealedQuestions: liveRooms[roomCode].revealedQuestions
      });

      io.emit('activeRoomsUpdate', getActiveRoomsSummary());
    } catch (err) {
      console.error('Error creating room:', err);
      socket.emit('roomError', 'Failed to load quiz.');
    }
  });

  // Presenter resumes an incomplete session
  socket.on('resumeSession', async ({ sessionFilename }) => {
    try {
      // Extract session ID from filename (session_123.json → 123)
      const sessionId = sessionFilename.includes('_')
        ? parseInt(sessionFilename.split('_')[1].replace('.json', ''))
        : parseInt(sessionFilename);

      if (isNaN(sessionId)) {
        return socket.emit('roomError', 'Invalid session ID format');
      }

      // Load session data from database
      const sessionResult = await pool.query(`
        SELECT
          gs.id,
          gs.room_code as original_room_code,
          gs.quiz_id,
          gs.created_at,
          q.title as quiz_title
        FROM game_sessions gs
        JOIN quizzes q ON gs.quiz_id = q.id
        WHERE gs.id = $1
      `, [sessionId]);

      if (sessionResult.rows.length === 0) {
        return socket.emit('roomError', 'Session not found');
      }

      const session = sessionResult.rows[0];

      // Generate new room code for resumed session
      const roomCode = Math.floor(1000 + Math.random() * 9000).toString();

      // Load the quiz data from database
      const quiz = await getQuizById(session.quiz_id);
      if (!quiz) {
        return socket.emit('roomError', 'Quiz not found for this session');
      }

      // Convert database format to legacy format for compatibility
      const quizData = {
        filename: `quiz_${session.quiz_id}.json`,
        title: quiz.title,
        description: quiz.description,
        questions: quiz.questions.map(q => ({
          id: q.id,
          text: q.text,
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

      liveRooms[roomCode] = {
        quizFilename: `quiz_${session.quiz_id}.json`,
        quizId: session.quiz_id,
        quizData,
        players,
        presenterId: socket.id,
        currentQuestionIndex: null,
        presentedQuestions,
        revealedQuestions,
        kickedPlayers: {}, // { username: kickedTimestamp }
        status: 'in_progress',
        createdAt: session.created_at,
        resumedAt: new Date().toISOString(),
        originalRoomCode: session.original_room_code,
        originalSessionId: sessionId
      };

      console.log(`Room ${roomCode} resumed from session ID ${sessionId} (original room: ${session.original_room_code})`);

      socket.join(roomCode);
      socket.emit('roomCreated', {
        roomCode,
        quizTitle: quizData.title,
        questions: quizData.questions,
        presentedQuestions: liveRooms[roomCode].presentedQuestions,
        revealedQuestions: liveRooms[roomCode].revealedQuestions,
        isResumed: true,
        originalRoomCode: session.original_room_code
      });

      // Send the player list to the presenter (shows disconnected players from previous session, excluding spectators)
      io.to(roomCode).emit('playerListUpdate', {
        roomCode,
        players: Object.values(liveRooms[roomCode].players).filter(p => !p.isSpectator)
      });

      io.emit('activeRoomsUpdate', getActiveRoomsSummary());
    } catch (err) {
      console.error('Error resuming session:', err);
      socket.emit('roomError', 'Failed to resume session.');
    }
  });

  // Presenter views a room
  socket.on('viewRoom', ({ roomCode }) => {
    const room = liveRooms[roomCode];
    if (!room) {
      socket.emit('roomError', 'Room not found.');
      return;
    }

    socket.join(roomCode);
    socket.emit('roomRestored', {
      roomCode,
      quizTitle: room.quizData.title,
      questions: room.quizData.questions,
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
  socket.on('joinRoom', async ({ roomCode, username, displayName }) => {
    const room = liveRooms[roomCode];
    if (!room) {
      socket.emit('roomError', 'Room not found.');
      return;
    }

    // Support legacy playerName parameter for backward compatibility
    const playerUsername = username;
    const playerDisplayName = displayName;

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

    // Check if a player with this username already exists in the room (reconnection scenario)
    const existingPlayer = Object.entries(room.players).find(([, player]) => player.username === playerUsername);

    if (existingPlayer) {
      const [oldSocketId, playerData] = existingPlayer;

      // If player is still connected, reject duplicate username
      if (playerData.connected) {
        socket.emit('roomError', `Username "${playerUsername}" is already connected in this room.`);
        return;
      }

      // Player is reconnecting - update their socket.id and mark as connected
      delete room.players[oldSocketId]; // Remove old socket.id entry

      // Determine if they already answered the current question
      let currentChoice = null;
      if (room.currentQuestionIndex !== null && playerData.answers && playerData.answers[room.currentQuestionIndex] !== undefined) {
        currentChoice = playerData.answers[room.currentQuestionIndex];
      }

      room.players[socket.id] = {
        ...playerData,
        id: socket.id,
        username: playerUsername, // Account username
        name: playerDisplayName, // Display name (update in case they changed it)
        userId: userId, // Associate with user account
        connected: true,
        connectionState: 'connected', // 'connected' | 'away' | 'disconnected' | 'warning'
        choice: currentChoice, // Restore choice if they already answered current question
        isSpectator: playerUsername === 'Display' || playerDisplayName === 'Spectator Display' // Flag spectators
      };
      socket.join(roomCode);
      // Only log reconnections for non-spectators
      if (!room.players[socket.id].isSpectator) {
        console.log(`${playerDisplayName} (${playerUsername}) reconnected to room ${roomCode} (${Object.keys(playerData.answers || {}).length} previous answers preserved)`);
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
        choice: null,
        connected: true,
        connectionState: 'connected', // 'connected' | 'away' | 'disconnected' | 'warning'
        answers: existingAnswers,
        isSpectator: playerUsername === 'Display' || playerDisplayName === 'Spectator Display' // Flag spectators
      };
      socket.join(roomCode);
      // Only log for non-spectators (use isSpectator variable defined earlier)
      if (!isSpectator) {
        console.log(`${playerDisplayName} (${playerUsername}) joined room ${roomCode}`);
      }
    }

    io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players).filter(p => !p.isSpectator) });
    io.emit('activeRoomsUpdate', getActiveRoomsSummary());

    // Send the player's answer history with detailed information (skip for spectators)
    if (!room.players[socket.id].isSpectator) {
      const playerAnswers = room.players[socket.id].answers || {};
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
    const room = liveRooms[roomCode];
    if (!room || !room.players[socket.id]) return;

    const player = room.players[socket.id];
    const oldState = player.connectionState;
    player.connectionState = state;

    console.log(`[CONNECTION] ${player.name} (${username}) state changed: ${oldState} → ${state}`);

    // Broadcast updated player list to all clients in the room
    io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players).filter(p => !p.isSpectator) });
  });

  // Presenter presents a question
  socket.on('presentQuestion', ({ roomCode, questionIndex }) => {
    const room = liveRooms[roomCode];
    if (!room) return;

    room.currentQuestionIndex = questionIndex;

    // Track this question as presented
    if (!room.presentedQuestions.includes(questionIndex)) {
      room.presentedQuestions.push(questionIndex);
    }

    // Reset current choice (but preserve answers history)
    Object.values(room.players).forEach(p => p.choice = null);

    const question = room.quizData.questions[questionIndex];
    io.to(roomCode).emit('questionPresented', { questionIndex, question, presentedQuestions: room.presentedQuestions });

    // Update player list to show reset choices
    io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players).filter(p => !p.isSpectator) });
  });

  // Player submits answer
  socket.on('submitAnswer', ({ roomCode, choice }) => {
    const room = liveRooms[roomCode];
    if (!room || room.currentQuestionIndex === null) return;

    if (room.players[socket.id]) {
      const player = room.players[socket.id];

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

      io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players).filter(p => !p.isSpectator) });

      console.log(`${player.name} answered question ${room.currentQuestionIndex} with choice ${choice}`);
    }
  });

  // Presenter reveals answer
  socket.on('revealAnswer', ({ roomCode }) => {
    const room = liveRooms[roomCode];
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
    const room = liveRooms[roomCode];
    if (!room) return;

    room.status = 'completed';
    room.completedAt = new Date().toISOString();

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

  // Close room
  socket.on('closeRoom', async ({ roomCode }) => {
    const room = liveRooms[roomCode];
    if (!room) return;

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

    delete liveRooms[roomCode];
    io.to(roomCode).emit('roomClosed', { roomCode });
    io.socketsLeave(roomCode);
    console.log(`Room ${roomCode} closed.`);
    io.emit('activeRoomsUpdate', getActiveRoomsSummary());
  });

  // Kick player from room
  socket.on('kickPlayer', ({ roomCode, username }) => {
    const room = liveRooms[roomCode];
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

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    for (const [roomCode, room] of Object.entries(liveRooms)) {
      if (room.players[socket.id]) {
        const playerName = room.players[socket.id].name;
        // Mark as disconnected instead of deleting
        room.players[socket.id].connected = false;
        io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players).filter(p => !p.isSpectator) });
        io.emit('activeRoomsUpdate', getActiveRoomsSummary());
        console.log(`${playerName} disconnected from room ${roomCode}`);
      }
      if (room.presenterId === socket.id) {
        console.log(`Presenter disconnected from room ${roomCode}. Reason: ${reason}`);
        // Auto-save before closing if presenter disconnects
        if (sessionHasAnswers(room)) {
          room.status = 'interrupted';
          room.completedAt = new Date().toISOString();
          saveSession(roomCode, room).catch(err =>
            console.error('Error auto-saving session on presenter disconnect:', err)
          );
        }
        io.to(roomCode).emit('roomClosed', { roomCode });
        delete liveRooms[roomCode];
        io.emit('activeRoomsUpdate', getActiveRoomsSummary());
      }
    }
  });
});

// --------------------
// Helper: Active Room Summary
// --------------------
function getActiveRoomsSummary() {
  return Object.entries(liveRooms).map(([roomCode, room]) => ({
    roomCode,
    quizTitle: room.quizData.title,
    playerCount: Object.values(room.players).filter(p => !p.isSpectator).length,
    isActive: room.currentQuestionIndex !== null,
    status: room.status
  }));
}
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
      liveRooms: Object.entries(liveRooms).map(([code, room]) => ({
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
      totalRooms: Object.keys(liveRooms).length,
      totalPlayers: Object.values(liveRooms).reduce((sum, room) =>
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
    const room = liveRooms[roomCode];

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
      if (liveRooms[finalRoomCode]) {
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

      // Create room
      liveRooms[finalRoomCode] = {
        quizData: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          questions: quiz.questions.map(q => ({
            text: q.text,
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

      const room = liveRooms[roomCode];
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

      const room = liveRooms[roomCode];
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

      const room = liveRooms[roomCode];
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

      const room = liveRooms[roomCode];
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
      const { deleteRooms, deleteTestUsers } = req.body;
      const results = { roomsDeleted: 0, usersDeleted: 0 };

      // Delete all live rooms
      if (deleteRooms) {
        results.roomsDeleted = Object.keys(liveRooms).length;
        Object.keys(liveRooms).forEach(code => delete liveRooms[code]);
      }

      // Delete test users (those starting with 'test' or 'debug')
      if (deleteTestUsers) {
        const deleteResult = await pool.query(
          "DELETE FROM users WHERE username LIKE 'test%' OR username LIKE 'debug%' RETURNING id"
        );
        results.usersDeleted = deleteResult.rowCount;
      }

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

        liveRooms[roomCode] = {
          quizData: {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            questions: quiz.questions.map(q => ({
              text: q.text,
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
          liveRooms[roomCode].players[fakeSocketId] = {
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
        liveRooms[roomCode].currentQuestionIndex = 0;
        liveRooms[roomCode].presentedQuestions.push(0);
        results.steps.push({ step: 'present-question', questionIndex: 0, success: true });

        // Step 4: Submit random answers
        const question = liveRooms[roomCode].quizData.questions[0];
        Object.values(liveRooms[roomCode].players).forEach(player => {
          const randomChoice = Math.floor(Math.random() * question.choices.length);
          player.choice = randomChoice;
          player.answers[0] = randomChoice;
        });
        results.steps.push({ step: 'submit-answers', count: testPlayers.length, success: true });

        // Step 5: Reveal answer
        liveRooms[roomCode].revealedQuestions.push(0);
        const correctAnswers = Object.values(liveRooms[roomCode].players).filter(
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

  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();