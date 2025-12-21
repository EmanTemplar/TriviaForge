/**
 * TriviaForge - Application Constants
 *
 * Single source of truth for all magic strings, enums, and configuration values.
 * Prefer importing from here over hardcoded strings throughout the app.
 */

// ============================================================================
// USER ROLES & ACCOUNT TYPES
// ============================================================================

export const USER_ROLES = {
  ADMIN: 'admin',
  PLAYER: 'player',
  GUEST: 'guest',
};

export const ACCOUNT_TYPES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PLAYER: 'player',
  GUEST: 'guest',
};

// ============================================================================
// ROOM & SESSION STATES
// ============================================================================

export const ROOM_STATES = {
  WAITING: 'waiting',
  PRESENTING: 'presenting',
  REVEALED: 'revealed',
  COMPLETED: 'completed',
};

export const SESSION_STATES = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  INCOMPLETE: 'incomplete',
};

// ============================================================================
// PLAYER CONNECTION STATES
// ============================================================================

export const CONNECTION_STATES = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  AWAY: 'away',
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER_PLAYER: '/api/auth/register-player',
    REGISTER_GUEST: '/api/auth/register-guest',
    PLAYER_LOGIN: '/api/auth/player-login',
    VERIFY_PLAYER: '/api/auth/verify-player',
    SET_NEW_PASSWORD: '/api/auth/set-new-password',
    CHECK_USERNAME: '/api/auth/check-username',
    ME: '/api/auth/me',
    CSRF_TOKEN: '/api/csrf-token',
  },

  // Quizzes
  QUIZZES: {
    LIST: '/api/quizzes',
    CREATE: '/api/quizzes',
    GET: (id) => `/api/quizzes/${id}`,
    UPDATE: (id) => `/api/quizzes/${id}`,
    DELETE: (id) => `/api/quizzes/${id}`,
    IMPORT: '/api/import-quiz',
    TEMPLATE: '/api/quiz-template',
  },

  // Sessions
  SESSIONS: {
    LIST: '/api/sessions',
    INCOMPLETE: '/api/sessions/incomplete',
    COMPLETED: '/api/sessions/completed',
    GET: (id) => `/api/sessions/${id}`,
    DELETE: (id) => `/api/sessions/${id}`,
  },

  // Rooms
  ROOMS: {
    CHECK_ACTIVE: '/api/rooms/check-active',
    PROGRESS: (roomCode) => `/api/room/progress/${roomCode}`,
  },

  // Users
  USERS: {
    LIST: '/api/users',
    DELETE: (userId) => `/api/users/${userId}`,
    RESET_PASSWORD: (userId) => `/api/users/${userId}/reset-password`,
    DOWNGRADE: (userId) => `/api/users/${userId}/downgrade`,
  },

  // Player Management
  PLAYER: {
    PROGRESS: (roomCode) => `/api/player/progress/${roomCode}`,
    KICK: '/api/kicked-player',
  },

  // Banned Names
  BANNED_NAMES: {
    LIST: '/api/banned-names',
    CREATE: '/api/banned-names',
    DELETE: (id) => `/api/banned-names/${id}`,
  },

  // Options
  OPTIONS: {
    GET: '/api/options',
    UPDATE: '/api/options',
  },

  // QR Codes
  QR: {
    PLAYER: '/api/qr/player',
    ROOM: (roomCode) => `/api/qr/room/${roomCode}`,
  },

  // Debug (only available in development)
  DEBUG: {
    STATE: '/api/debug/state',
    ROOM: (roomCode) => `/api/debug/room/${roomCode}`,
    CREATE_ROOM: '/api/debug/create-test-room',
    ADD_PLAYER: '/api/debug/add-test-player',
    SUBMIT_ANSWER: '/api/debug/submit-answer',
    PRESENT_QUESTION: '/api/debug/present-question',
    REVEAL_ANSWER: '/api/debug/reveal-answer',
    CLEANUP: '/api/debug/cleanup',
    RUN_SCENARIO: '/api/debug/run-test-scenario',
  },
};

// ============================================================================
// SOCKET.IO EVENTS
// ============================================================================

export const SOCKET_EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  HEARTBEAT: 'heartbeat',

  // Room Management
  GET_ACTIVE_ROOMS: 'getActiveRooms',
  CREATE_ROOM: 'createRoom',
  RESUME_SESSION: 'resumeSession',
  VIEW_ROOM: 'viewRoom',
  JOIN_ROOM: 'joinRoom',
  CLOSE_ROOM: 'closeRoom',

  // Room State Updates
  ROOM_CREATED: 'roomCreated',
  ROOM_RESTORED: 'roomRestored',
  ROOM_JOINED: 'roomJoined',
  ROOM_ERROR: 'roomError',
  ROOM_CLOSED: 'roomClosed',
  ACTIVE_ROOMS_UPDATE: 'activeRoomsUpdate',

  // Player Management
  PLAYER_LIST_UPDATE: 'playerListUpdate',
  PLAYER_STATE_CHANGE: 'playerStateChange',
  KICK_PLAYER: 'kickPlayer',
  PLAYER_KICKED: 'playerKicked',

  // Question Flow
  PRESENT_QUESTION: 'presentQuestion',
  QUESTION_PRESENTED: 'questionPresented',
  SUBMIT_ANSWER: 'submitAnswer',
  ANSWER_SUBMITTED: 'answerSubmitted',
  REVEAL_ANSWER: 'revealAnswer',
  QUESTION_REVEALED: 'questionRevealed',
  ANSWER_HISTORY_RESTORED: 'answerHistoryRestored',

  // Quiz Completion
  COMPLETE_QUIZ: 'completeQuiz',
  QUIZ_COMPLETED: 'quizCompleted',
};

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  PRECONDITION_REQUIRED: 428, // Used for password reset flow
  INTERNAL_SERVER_ERROR: 500,
};

// ============================================================================
// ERROR CODES
// ============================================================================

export const ERROR_CODES = {
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',

  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  ADMIN_ACCESS_REQUIRED: 'ADMIN_ACCESS_REQUIRED',
  PASSWORD_RESET_REQUIRED: 'PASSWORD_RESET_REQUIRED',

  // Room/Session
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_ALREADY_EXISTS: 'ROOM_EXISTS',
  ROOM_FULL: 'ROOM_FULL',
  ANSWER_LOCKED: 'ANSWER_LOCKED',
  QUESTION_NOT_PRESENTED: 'QUESTION_NOT_PRESENTED',
  QUESTION_ALREADY_REVEALED: 'QUESTION_ALREADY_REVEALED',

  // User Management
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  DISPLAY_NAME_BANNED: 'DISPLAY_NAME_BANNED',
  PLAYER_ALREADY_IN_ROOM: 'PLAYER_ALREADY_IN_ROOM',

  // Database
  DATABASE_ERROR: 'DATABASE_ERROR',
  QUERY_FAILED: 'QUERY_FAILED',
};

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9_]{3,50}$/,
  },

  PASSWORD: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 128,
  },

  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  DISPLAY_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 30,
  },

  ROOM_CODE: {
    LENGTH: 4,
    PATTERN: /^[0-9]{4}$/,
  },

  QUESTION_TEXT: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 500,
  },

  ANSWER_CHOICE: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 200,
  },

  QUIZ_TITLE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 100,
  },
};

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULTS = {
  SESSION_TIMEOUT: 3600000, // 1 hour in milliseconds
  AUTO_SAVE_INTERVAL: 120000, // 2 minutes in milliseconds
  ANSWER_DISPLAY_TIME: 30, // seconds
  DATABASE_POOL_SIZE: 10,
  SOCKET_PING_TIMEOUT: 360000, // 6 minutes
  SOCKET_PING_INTERVAL: 25000, // 25 seconds
  BCRYPT_SALT_ROUNDS: 10,
};

// ============================================================================
// PAGINATION
// ============================================================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

// ============================================================================
// FILE UPLOAD
// ============================================================================

export const FILE_UPLOAD = {
  MAX_FILE_SIZE: 5242880, // 5MB in bytes
  ALLOWED_MIME_TYPES: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  ALLOWED_EXTENSIONS: ['.xls', '.xlsx'],
};

// ============================================================================
// QUIZ CONSTRAINTS
// ============================================================================

export const QUIZ_CONSTRAINTS = {
  MIN_QUESTIONS: 1,
  MAX_QUESTIONS: 100,
  MIN_CHOICES: 2,
  MAX_CHOICES: 10,
  MAX_QUIZ_TITLE_LENGTH: 100,
};

// ============================================================================
// RATE LIMITING
// ============================================================================

export const RATE_LIMITS = {
  AUTH: {
    MAX_REQUESTS: 5,
    WINDOW_MS: 900000, // 15 minutes
  },

  REGISTRATION: {
    MAX_REQUESTS: 10,
    WINDOW_MS: 3600000, // 1 hour
  },

  API: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 900000, // 15 minutes
  },
};

// ============================================================================
// LOGGING
// ============================================================================

export const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  VERBOSE: 'VERBOSE',
};

export const LOG_PREFIXES = {
  RECONNECT: '[RECONNECT]',
  DISCONNECT: '[DISCONNECT]',
  SPECTATOR: '[SPECTATOR]',
  ROOM: '[ROOM]',
  DATABASE: '[DATABASE]',
  AUTH: '[AUTH]',
  SOCKET: '[SOCKET]',
  CLEANUP: '[CLEANUP]',
};

// ============================================================================
// DATABASE TABLE NAMES (for query building)
// ============================================================================

export const TABLES = {
  USERS: 'users',
  QUESTIONS: 'questions',
  ANSWERS: 'answers',
  QUIZZES: 'quizzes',
  QUIZ_QUESTIONS: 'quiz_questions',
  GAME_SESSIONS: 'game_sessions',
  SESSION_QUESTIONS: 'session_questions',
  GAME_PARTICIPANTS: 'game_participants',
  PARTICIPANT_ANSWERS: 'participant_answers',
  USER_SESSIONS: 'user_sessions',
  APP_SETTINGS: 'app_settings',
  BANNED_DISPLAY_NAMES: 'banned_display_names',
};

// ============================================================================
// VIEWS
// ============================================================================

export const VIEWS = {
  QUIZ_FULL_DETAILS: 'quiz_full_details',
  ACTIVE_SESSIONS_SUMMARY: 'active_sessions_summary',
  PARTICIPANT_PERFORMANCE: 'participant_performance',
};

// ============================================================================
// ENVIRONMENT VARIABLES (documentation/reference)
// ============================================================================

export const ENV_VARS = {
  NODE_ENV: 'NODE_ENV',
  APP_PORT: 'APP_PORT',
  DATABASE_URL: 'DATABASE_URL',
  ADMIN_PASSWORD: 'ADMIN_PASSWORD',
  SERVER_URL: 'SERVER_URL',
  HOST_IP: 'HOST_IP',
  SESSION_TIMEOUT: 'SESSION_TIMEOUT',
  DEBUG_MODE: 'DEBUG_MODE',
  VERBOSE_LOGGING: 'VERBOSE_LOGGING',
  CSRF_SECRET: 'CSRF_SECRET',
  TZ: 'TZ',
};

// ============================================================================
// EXPORTS (for backwards compatibility if needed)
// ============================================================================

export default {
  USER_ROLES,
  ACCOUNT_TYPES,
  ROOM_STATES,
  SESSION_STATES,
  CONNECTION_STATES,
  API_ENDPOINTS,
  SOCKET_EVENTS,
  HTTP_STATUS,
  ERROR_CODES,
  VALIDATION_RULES,
  DEFAULTS,
  PAGINATION,
  FILE_UPLOAD,
  QUIZ_CONSTRAINTS,
  RATE_LIMITS,
  LOG_LEVELS,
  LOG_PREFIXES,
  TABLES,
  VIEWS,
  ENV_VARS,
};
