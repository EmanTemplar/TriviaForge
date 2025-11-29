// Application Constants

export const ROLES = {
  ADMIN: 'admin',
  PRESENTER: 'presenter',
  PLAYER: 'player',
  GUEST: 'guest'
}

export const SOCKET_EVENTS = {
  // Room Events
  CREATE_ROOM: 'createRoom',
  RESUME_SESSION: 'resumeSession',
  JOIN_ROOM: 'joinRoom',
  LEAVE_ROOM: 'leaveRoom',
  ROOM_JOINED: 'roomJoined',
  ROOM_LEFT: 'roomLeft',

  // Question Events
  PRESENT_QUESTION: 'presentQuestion',
  QUESTION_PRESENTED: 'questionPresented',
  SUBMIT_ANSWER: 'submitAnswer',
  ANSWER_SUBMITTED: 'answerSubmitted',
  REVEAL_ANSWER: 'revealAnswer',
  ANSWER_REVEALED: 'answerRevealed',

  // Game Events
  COMPLETE_QUIZ: 'completeQuiz',
  QUIZ_COMPLETED: 'quizCompleted',
  NEXT_QUESTION: 'nextQuestion',
  ROOM_CLOSED: 'roomClosed',

  // Participant Events
  PARTICIPANT_JOINED: 'participantJoined',
  PARTICIPANT_LEFT: 'participantLeft',
  PARTICIPANTS_UPDATED: 'participantsUpdated',

  // Connection Events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error'
}

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/login',
  ADMIN_LOGIN: '/api/admin/login',
  LOGOUT: '/api/logout',
  VALIDATE_TOKEN: '/api/validate-token',
  CHANGE_PASSWORD: '/api/change-password',

  // Quizzes
  GET_QUIZZES: '/api/quizzes',
  GET_QUIZ: '/api/quizzes/:id',
  CREATE_QUIZ: '/api/quizzes',
  UPDATE_QUIZ: '/api/quizzes/:id',
  DELETE_QUIZ: '/api/quizzes/:id',
  IMPORT_QUIZ: '/api/quizzes/import',

  // Questions
  GET_QUESTIONS: '/api/questions',
  GET_QUESTION: '/api/questions/:id',
  CREATE_QUESTION: '/api/questions',
  UPDATE_QUESTION: '/api/questions/:id',
  DELETE_QUESTION: '/api/questions/:id',

  // Sessions
  GET_SESSIONS: '/api/sessions',
  GET_SESSION: '/api/sessions/:id',
  GET_ACTIVE_SESSIONS: '/api/sessions/active',

  // Players
  GET_PLAYERS: '/api/players',
  GET_PLAYER: '/api/players/:id',
  GET_PLAYER_PROGRESS: '/api/player/progress/:roomCode',

  // Rooms
  GET_ROOM_PROGRESS: '/api/room/progress/:roomCode',

  // Admin
  GET_USERS: '/api/admin/users',
  DELETE_USER: '/api/admin/users/:id',
  RESET_USER_PASSWORD: '/api/admin/users/:id/reset-password',
  DOWNGRADE_USER: '/api/admin/users/:id/downgrade'
}

export const VALIDATION = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 50,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
  QUIZ_TITLE_MAX_LENGTH: 255,
  QUESTION_TEXT_MAX_LENGTH: 1000,
  ANSWER_TEXT_MAX_LENGTH: 500,
  ROOM_CODE_LENGTH: 6
}

export const TOAST_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
}

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
}

export const SESSION_TIMEOUT = 3600000 // 1 hour in milliseconds

export const SOCKET_IO_CONFIG = {
  RECONNECTION: true,
  RECONNECTION_DELAY: 1000,
  RECONNECTION_DELAY_MAX: 5000,
  RECONNECTION_ATTEMPTS: 5,
  PING_INTERVAL: 25000,
  PING_TIMEOUT: 60000
}
