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

// Redirect root to landing page BEFORE static files
app.get('/', (req, res) => {
  res.redirect('/landing.html');
});

// Load .env file from root directory (for both Docker and local development)
// When running locally, looks for .env in parent directory
// When running in Docker, environment variables are passed via docker-compose.yml
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

app.use(express.static('public'));

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
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

// Event handlers for connection pool
pool.on('connect', () => {
  console.log('✅ PostgreSQL client connected to pool');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL pool error:', err);
});

// Test initial connection on startup
try {
  const testConnection = await pool.query('SELECT NOW() as current_time');
  console.log('🗄️  Database connection test successful at:', testConnection.rows[0].current_time);
} catch (err) {
  console.error('❌ Failed to connect to PostgreSQL database:', err.message);
  console.error('⚠️  Application will continue but database features will not work');
  console.error('💡 Make sure PostgreSQL container is running: docker-compose up -d db');
}

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

// Test query with sample data
try {
  const sampleQuiz = await getQuizById(1);
  if (sampleQuiz) {
    console.log('✅ Sample query successful! Quiz:', sampleQuiz.title);
    console.log(`   └─ ${sampleQuiz.questions.length} question(s) loaded`);
  } else {
    console.log('ℹ️  No quiz with ID 1 found (this is normal for a fresh database)');
  }
} catch (err) {
  console.error('❌ Sample query failed:', err.message);
}

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
        q.title as quiz_title,
        COUNT(DISTINCT gp.id) as player_count,
        COUNT(DISTINCT sq.id) as question_count,
        COUNT(DISTINCT CASE WHEN sq.is_presented THEN sq.id END) as presented_count
      FROM game_sessions gs
      JOIN quizzes q ON gs.quiz_id = q.id
      LEFT JOIN game_participants gp ON gs.id = gp.game_session_id
      LEFT JOIN session_questions sq ON gs.id = sq.game_session_id
      GROUP BY gs.id, gs.room_code, gs.status, gs.created_at, gs.completed_at, q.title
      ORDER BY gs.created_at DESC
    `);

    return result.rows.map(row => ({
      sessionId: row.id,
      roomCode: row.room_code,
      quizTitle: row.quiz_title,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      playerCount: parseInt(row.player_count),
      questionCount: parseInt(row.question_count),
      presentedCount: parseInt(row.presented_count)
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
      room.status || 'in-progress',
      room.currentQuestionIndex,
      room.createdAt,
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
      // Insert participant (user_id is NULL for anonymous players)
      const participantResult = await client.query(`
        INSERT INTO game_participants (
          user_id, game_session_id, display_name, score,
          is_connected, socket_id, joined_at, last_seen
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        null, // user_id (will be set when we add authentication)
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
    const playerUrl = `${SERVER_URL}/player.html`;
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
    const roomUrl = `${SERVER_URL}/player.html?room=${roomCode}`;
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
app.get('/api/options', async (req, res) => {
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
app.post('/api/options', async (req, res) => {
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
app.get('/api/quizzes', async (req, res) => {
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
app.get('/api/quizzes/:filename', async (req, res) => {
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
app.post('/api/quizzes', async (req, res) => {
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
app.put('/api/quizzes/:filename', async (req, res) => {
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

    // Delete old quiz-question relationships and questions (cascades to answers)
    await client.query(`
      DELETE FROM questions
      WHERE id IN (
        SELECT question_id FROM quiz_questions WHERE quiz_id = $1
      )
    `, [quizId]);

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
app.delete('/api/quizzes/:filename', async (req, res) => {
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
// Routes: Completed Sessions
// --------------------

// Get all completed sessions
app.get('/api/sessions', async (req, res) => {
  const sessions = await listCompletedSessions();
  res.json(sessions);
});

// Get incomplete sessions only
app.get('/api/sessions/incomplete', async (req, res) => {
  const sessions = await listCompletedSessions();
  const incomplete = sessions.filter(s => s.status !== 'completed');
  res.json(incomplete);
});

// Get single session (from database)
app.get('/api/sessions/:filename', async (req, res) => {
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

    // Fetch participants with their answers
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
      WHERE gp.game_session_id = $1
      ORDER BY gp.display_name, sq.presentation_order
    `, [sessionId]);

    // Group answers by player
    const playersMap = new Map();
    for (const row of participantsResult.rows) {
      if (!playersMap.has(row.display_name)) {
        playersMap.set(row.display_name, {
          name: row.display_name,
          answers: {}
        });
      }
      if (row.question_id && row.presentation_order !== null) {
        playersMap.get(row.display_name).answers[row.presentation_order] = row.choice_index;
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
    const response = {
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
      players: Array.from(playersMap.values())
    };

    res.json(response);
  } catch (err) {
    console.error('Error fetching session:', err);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// Delete session (from database)
app.delete('/api/sessions/:filename', async (req, res) => {
  try {
    // Extract session ID from filename
    const sessionId = req.params.filename.includes('_')
      ? parseInt(req.params.filename.split('_')[1].replace('.json', ''))
      : parseInt(req.params.filename);

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    // Soft delete: mark session as deleted (or hard delete if preferred)
    const result = await pool.query(
      'DELETE FROM game_sessions WHERE id = $1 RETURNING id',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting session:', err);
    res.status(500).json({ error: 'Failed to delete session' });
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

// Load quiz options on startup from database
(async () => {
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
})();

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
          status: 'in-progress',
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
          gp.display_name,
          pa.question_id,
          sq.presentation_order,
          a.display_order as choice_index
        FROM game_participants gp
        LEFT JOIN participant_answers pa ON gp.id = pa.participant_id
        LEFT JOIN session_questions sq ON pa.question_id = sq.question_id AND sq.game_session_id = $1
        LEFT JOIN answers a ON pa.answer_id = a.id
        WHERE gp.game_session_id = $1
        ORDER BY gp.display_name
      `, [sessionId]);

      // Reconstruct players from database data
      const playersMap = new Map();
      for (const row of participantsResult.rows) {
        if (!playersMap.has(row.display_name)) {
          const playerId = `temp_${row.display_name}`;
          playersMap.set(row.display_name, {
            id: playerId,
            name: row.display_name,
            choice: null,
            connected: false,
            answers: {},
            isResumed: true
          });
        }
        if (row.presentation_order !== null && row.choice_index !== null) {
          playersMap.get(row.display_name).answers[row.presentation_order] = row.choice_index;
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
        status: 'in-progress',
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

      // Send the player list to the presenter (shows disconnected players from previous session)
      io.to(roomCode).emit('playerListUpdate', {
        roomCode,
        players: Object.values(liveRooms[roomCode].players)
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
      players: Object.values(room.players)
    });

    // If there's a current question active, send it to the viewer
    if (room.currentQuestionIndex !== null) {
      const question = room.quizData.questions[room.currentQuestionIndex];
      socket.emit('questionPresented', { questionIndex: room.currentQuestionIndex, question });
    }
  });

  // Player joins a room
  socket.on('joinRoom', ({ roomCode, playerName }) => {
    const room = liveRooms[roomCode];
    if (!room) {
      socket.emit('roomError', 'Room not found.');
      return;
    }

    // Check if a player with this name already exists in the room
    const existingPlayer = Object.entries(room.players).find(([, player]) => player.name === playerName);

    if (existingPlayer) {
      const [oldSocketId, playerData] = existingPlayer;

      // If player is still connected, reject duplicate name
      if (playerData.connected) {
        socket.emit('roomError', `Name "${playerName}" is already taken in this room.`);
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
        connected: true,
        choice: currentChoice // Restore choice if they already answered current question
      };
      socket.join(roomCode);
      console.log(`${playerName} reconnected to room ${roomCode} (${Object.keys(playerData.answers || {}).length} previous answers preserved)`);
    } else {
      // Check if this is a resumed session with temp player entry
      let existingAnswers = {};
      const tempPlayerId = `temp_${playerName}`;
      if (room.players[tempPlayerId] && room.players[tempPlayerId].isResumed) {
        // Player is rejoining a resumed session - keep their old answers
        existingAnswers = room.players[tempPlayerId].answers || {};
        delete room.players[tempPlayerId]; // Remove temp entry
        console.log(`${playerName} rejoined resumed session with ${Object.keys(existingAnswers).length} previous answers`);
      }

      // New player joining
      room.players[socket.id] = {
        id: socket.id,
        name: playerName,
        choice: null,
        connected: true,
        answers: existingAnswers
      };
      socket.join(roomCode);
      console.log(`${playerName} joined room ${roomCode}`);
    }

    io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players) });
    io.emit('activeRoomsUpdate', getActiveRoomsSummary());

    // Send the player's answer history so they know which questions they've already answered
    const answeredQuestionIndices = Object.keys(room.players[socket.id].answers || {}).map(idx => parseInt(idx));
    console.log(`[RESUME DEBUG] Sending answer history to ${playerName}:`, answeredQuestionIndices, 'Full answers:', room.players[socket.id].answers);
    socket.emit('answerHistoryRestored', { answeredQuestions: answeredQuestionIndices });

    // If there's a current question active, send it to the new player
    if (room.currentQuestionIndex !== null) {
      const question = room.quizData.questions[room.currentQuestionIndex];
      socket.emit('questionPresented', { questionIndex: room.currentQuestionIndex, question });
      console.log(`Sent current question ${room.currentQuestionIndex} to ${playerName}`);
    }
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
    io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players) });
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

      io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players) });

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

    const results = Object.values(room.players).map(p => ({
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
        room.status = room.status || 'closed';
        room.completedAt = new Date().toISOString();
        await saveSession(roomCode, room);
        console.log(`Session auto-saved before closing room ${roomCode}`);
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

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`[DISCONNECT DEBUG] Socket ${socket.id} disconnected. Reason: ${reason}`);

    for (const [roomCode, room] of Object.entries(liveRooms)) {
      if (room.players[socket.id]) {
        const playerName = room.players[socket.id].name;
        // Mark as disconnected instead of deleting
        room.players[socket.id].connected = false;
        io.to(roomCode).emit('playerListUpdate', { roomCode, players: Object.values(room.players) });
        io.emit('activeRoomsUpdate', getActiveRoomsSummary());
        console.log(`${playerName} disconnected from room ${roomCode}`);
      }
      if (room.presenterId === socket.id) {
        console.log(`[DISCONNECT DEBUG] PRESENTER disconnected from room ${roomCode}. Reason: ${reason}`);
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
    playerCount: Object.keys(room.players).length,
    isActive: room.currentQuestionIndex !== null,
    status: room.status
  }));
}
// --------------------
// END OF LIVE ROOMS LOGIC
// --------------------


// --------------------
// Start Server
// --------------------
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));