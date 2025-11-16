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
const QUIZ_FOLDER = path.join(process.cwd(), 'quizzes');
const COMPLETED_FOLDER = path.join(QUIZ_FOLDER, 'completed');
const TEMPLATES_FOLDER = path.join(process.cwd(), 'templates');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

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
// Helper: list quizzes
// --------------------
const listQuizzes = async () => {
  const files = await fs.readdir(QUIZ_FOLDER);
  const quizzes = [];
  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = JSON.parse(await fs.readFile(path.join(QUIZ_FOLDER, file), 'utf-8'));
      quizzes.push({ filename: file, title: data.title, description: data.description, questions: data.questions || [] });
    }
  }
  return quizzes;
};

// --------------------
// Helper: list completed sessions
// --------------------
const listCompletedSessions = async () => {
  try {
    const files = await fs.readdir(COMPLETED_FOLDER);
    const sessions = [];
    for (const file of files) {
      if (file.endsWith('.json')) {
        const data = JSON.parse(await fs.readFile(path.join(COMPLETED_FOLDER, file), 'utf-8'));
        sessions.push({ filename: file, ...data });
      }
    }
    // Sort by most recent timestamp (resumedAt if exists, otherwise createdAt)
    return sessions.sort((a, b) => {
      const aTime = new Date(a.resumedAt || a.createdAt);
      const bTime = new Date(b.resumedAt || b.createdAt);
      return bTime - aTime;
    });
  } catch (err) {
    return [];
  }
};

// --------------------
// Helper: save session to file
// --------------------
const saveSession = async (roomCode, room) => {
  const sessionData = {
    roomCode,
    quizTitle: room.quizData.title,
    quizFilename: room.quizFilename,
    status: room.status || 'in-progress',
    createdAt: room.createdAt,
    resumedAt: room.resumedAt || null,
    completedAt: room.completedAt || null,
    originalRoomCode: room.originalRoomCode || null,
    presentedQuestions: room.presentedQuestions || [],
    revealedQuestions: room.revealedQuestions || [],
    players: Object.values(room.players).map(p => ({
      name: p.name,
      answers: p.answers || {}
    })),
    questions: room.quizData.questions
  };

  const filename = `${roomCode}_${Date.now()}.json`;
  await fs.writeFile(
    path.join(COMPLETED_FOLDER, filename),
    JSON.stringify(sessionData, null, 2),
    'utf-8'
  );

  return filename;
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
app.get('/api/options', async (req, res) => {
  try {
    const optionsPath = path.join(QUIZ_FOLDER, 'quiz_options.json');
    const data = await fs.readFile(optionsPath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (err) {
    // Return defaults if file doesn't exist
    res.json({ answerDisplayTime: 30 });
  }
});

// Save quiz options
app.post('/api/options', async (req, res) => {
  try {
    const optionsPath = path.join(QUIZ_FOLDER, 'quiz_options.json');
    await fs.writeFile(optionsPath, JSON.stringify(req.body, null, 2), 'utf-8');
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
app.get('/api/quizzes', async (req, res) => {
  const quizzes = await listQuizzes();
  res.json(quizzes);
});

// Get single quiz
app.get('/api/quizzes/:filename', async (req, res) => {
  try {
    const filePath = path.join(QUIZ_FOLDER, req.params.filename);
    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Quiz not found' });
  }
});

// Create new quiz
app.post('/api/quizzes', async (req, res) => {
  const { title, description, questions } = req.body;
  const filename = `${title.replace(/\s+/g, '_')}_${Date.now()}.json`;
  const filePath = path.join(QUIZ_FOLDER, filename);
  const quizData = { title, description, questions: questions || [] };
  await fs.writeFile(filePath, JSON.stringify(quizData, null, 2), 'utf-8');
  res.json({ filename, ...quizData });
});

// Update quiz
app.put('/api/quizzes/:filename', async (req, res) => {
  try {
    const filePath = path.join(QUIZ_FOLDER, req.params.filename);
    const data = req.body;
    if (!Array.isArray(data.questions)) data.questions = [];
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save quiz' });
  }
});

// Delete quiz
app.delete('/api/quizzes/:filename', async (req, res) => {
  try {
    await fs.unlink(path.join(QUIZ_FOLDER, req.params.filename));
    res.json({ success: true });
  } catch (err) {
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

    // Save quiz
    const filename = `${title.replace(/\s+/g, '_')}_${Date.now()}.json`;
    const filePath = path.join(QUIZ_FOLDER, filename);
    const quizData = { title, description, questions };
    await fs.writeFile(filePath, JSON.stringify(quizData, null, 2), 'utf-8');

    res.json({
      success: true,
      filename,
      title,
      questionCount: questions.length
    });
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

// Get single session
app.get('/api/sessions/:filename', async (req, res) => {
  try {
    const filePath = path.join(COMPLETED_FOLDER, req.params.filename);
    const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(404).json({ error: 'Session not found' });
  }
});

// Delete session
app.delete('/api/sessions/:filename', async (req, res) => {
  try {
    await fs.unlink(path.join(COMPLETED_FOLDER, req.params.filename));
    res.json({ success: true });
  } catch (err) {
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
const liveRooms = {}; // { roomCode: { quizFilename, quizData, players: {}, presenterId, currentQuestionIndex, presentedQuestions: [], status, createdAt } }
let quizOptions = { answerDisplayTime: 30 }; // Default options

// Load quiz options on startup
(async () => {
  try {
    const optionsPath = path.join(QUIZ_FOLDER, 'quiz_options.json');
    const data = await fs.readFile(optionsPath, 'utf-8');
    quizOptions = JSON.parse(data);
    console.log('📋 Quiz options loaded:', quizOptions);
  } catch (err) {
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
      const quizPath = path.join(QUIZ_FOLDER, quizFilename);
      const quizData = JSON.parse(await fs.readFile(quizPath, 'utf-8'));

      if (!liveRooms[roomCode]) {
        liveRooms[roomCode] = {
          quizFilename,
          quizData,
          players: {},
          presenterId: socket.id,
          currentQuestionIndex: null,
          presentedQuestions: [],
          revealedQuestions: [],
          status: 'in-progress',
          createdAt: new Date().toISOString()
        };
        console.log(`Room ${roomCode} created for quiz ${quizFilename}`);
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
      const sessionPath = path.join(COMPLETED_FOLDER, sessionFilename);
      const sessionData = JSON.parse(await fs.readFile(sessionPath, 'utf-8'));

      // Generate new room code for resumed session
      const roomCode = Math.floor(1000 + Math.random() * 9000).toString();

      // Load the quiz data
      const quizPath = path.join(QUIZ_FOLDER, sessionData.quizFilename);
      const quizData = JSON.parse(await fs.readFile(quizPath, 'utf-8'));

      // Reconstruct players from session data
      const players = {};
      sessionData.players.forEach(p => {
        // Create a temporary player entry (they'll rejoin with new socket IDs)
        // Store their previous answers
        const playerId = `temp_${p.name}`;
        players[playerId] = {
          id: playerId,
          name: p.name,
          choice: null,
          connected: false, // Mark as disconnected until they rejoin
          answers: p.answers || {},
          isResumed: true // Flag to indicate this is from a resumed session
        };
      });

      liveRooms[roomCode] = {
        quizFilename: sessionData.quizFilename,
        quizData,
        players,
        presenterId: socket.id,
        currentQuestionIndex: null,
        presentedQuestions: sessionData.presentedQuestions || [],
        revealedQuestions: sessionData.revealedQuestions || [],
        status: 'in-progress',
        createdAt: sessionData.createdAt,
        resumedAt: new Date().toISOString(),
        originalRoomCode: sessionData.roomCode
      };

      console.log(`Room ${roomCode} resumed from session ${sessionData.roomCode}`);

      socket.join(roomCode);
      socket.emit('roomCreated', {
        roomCode,
        quizTitle: quizData.title,
        questions: quizData.questions,
        presentedQuestions: liveRooms[roomCode].presentedQuestions,
        revealedQuestions: liveRooms[roomCode].revealedQuestions,
        isResumed: true,
        originalRoomCode: sessionData.roomCode
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