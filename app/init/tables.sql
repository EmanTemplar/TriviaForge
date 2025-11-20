-- ============================================================================
-- TriviaForge Database Schema - Fully Normalized
-- ============================================================================
-- This schema provides maximum flexibility and data integrity for the trivia
-- application with support for user authentication, question reusability,
-- session management, and reconnection handling.
-- ============================================================================

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
-- Stores all users (guests, players, admins)
-- Guest accounts: username only (password_hash is NULL)
-- Full accounts: username + password_hash
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),  -- NULL for guest accounts
  account_type VARCHAR(50) DEFAULT 'guest' CHECK (account_type IN ('guest', 'player', 'admin')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast username lookups during login
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_account_type ON users(account_type);

-- ============================================================================
-- 2. QUESTIONS TABLE
-- ============================================================================
-- Individual questions that can be reused across multiple quizzes
-- Each question is independent and can belong to multiple quizzes
-- ============================================================================
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES users(id) ON DELETE SET NULL  -- Track who created the question
);

-- Index for searching questions by creator
CREATE INDEX idx_questions_created_by ON questions(created_by);
CREATE INDEX idx_questions_type ON questions(question_type);

-- ============================================================================
-- 3. ANSWERS TABLE
-- ============================================================================
-- Answer choices for each question (fully normalized)
-- Multiple answers per question, with one marked as correct
-- display_order determines how choices appear to players
-- ============================================================================
CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,  -- Order in which answers appear (0, 1, 2, 3...)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookup of all answers for a question
CREATE INDEX idx_answers_question_id ON answers(question_id);
CREATE INDEX idx_answers_question_order ON answers(question_id, display_order);

-- ============================================================================
-- 4. QUIZZES TABLE
-- ============================================================================
-- Quiz metadata and configuration
-- Questions are linked via quiz_questions junction table
-- ============================================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  answer_display_timeout INT DEFAULT 30,  -- Seconds before auto-reveal (from quiz options)
  is_active BOOLEAN DEFAULT TRUE,  -- Soft delete support
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES users(id) ON DELETE SET NULL
);

-- Index for quiz listing and searching
CREATE INDEX idx_quizzes_created_by ON quizzes(created_by);
CREATE INDEX idx_quizzes_is_active ON quizzes(is_active);
CREATE INDEX idx_quizzes_created_at ON quizzes(created_at DESC);

-- ============================================================================
-- 5. QUIZ_QUESTIONS TABLE (Junction Table)
-- ============================================================================
-- Defines which questions belong to which quizzes and their order
-- Same question can appear in multiple quizzes
-- question_order determines presentation order in the quiz
-- ============================================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_order INT NOT NULL,  -- Order in quiz (1st, 2nd, 3rd question, etc.)
  PRIMARY KEY (quiz_id, question_id),
  UNIQUE (quiz_id, question_order)  -- Ensure no duplicate order numbers in same quiz
);

-- Indexes for fast quiz question loading
CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id, question_order);
CREATE INDEX idx_quiz_questions_question ON quiz_questions(question_id);

-- ============================================================================
-- 6. GAME_SESSIONS TABLE
-- ============================================================================
-- Live and completed game sessions (replaces "rooms")
-- Tracks session state, status, and completion
-- Supports session resumption via original_session_id
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_sessions (
  id SERIAL PRIMARY KEY,
  quiz_id INT NOT NULL REFERENCES quizzes(id) ON DELETE RESTRICT,  -- Don't allow deleting quizzes with active sessions
  room_code VARCHAR(10) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'interrupted')),
  current_question_index INT DEFAULT -1,  -- -1 = not started, 0+ = question index
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  original_session_id INT REFERENCES game_sessions(id) ON DELETE SET NULL  -- For resumed sessions
);

-- Indexes for room lookup and session management
CREATE UNIQUE INDEX idx_game_sessions_room_code ON game_sessions(room_code);
CREATE INDEX idx_game_sessions_quiz_id ON game_sessions(quiz_id);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_game_sessions_created_at ON game_sessions(created_at DESC);

-- ============================================================================
-- 7. SESSION_QUESTIONS TABLE
-- ============================================================================
-- Tracks which questions have been presented/revealed in each session
-- Handles shuffled question order and progress tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_questions (
  id SERIAL PRIMARY KEY,
  game_session_id INT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  presentation_order INT NOT NULL,  -- Order questions were presented (may differ from quiz_questions.question_order if shuffled)
  is_presented BOOLEAN DEFAULT FALSE,  -- Has presenter shown this question?
  is_revealed BOOLEAN DEFAULT FALSE,   -- Has presenter revealed the answer?
  presented_at TIMESTAMP,
  revealed_at TIMESTAMP,
  UNIQUE (game_session_id, question_id),
  UNIQUE (game_session_id, presentation_order)
);

-- Indexes for session progress tracking
CREATE INDEX idx_session_questions_session ON session_questions(game_session_id, presentation_order);
CREATE INDEX idx_session_questions_progress ON session_questions(game_session_id, is_presented, is_revealed);

-- ============================================================================
-- 8. GAME_PARTICIPANTS TABLE
-- ============================================================================
-- Players participating in game sessions
-- Tracks connection status, score, and display name
-- socket_id enables reconnection detection
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_participants (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_session_id INT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,  -- Can differ from username
  score INT DEFAULT 0,
  is_connected BOOLEAN DEFAULT TRUE,
  socket_id VARCHAR(255),  -- Current socket connection ID
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, game_session_id)  -- User can only join same session once
);

-- Indexes for participant lookup and connection management
CREATE INDEX idx_game_participants_session ON game_participants(game_session_id);
CREATE INDEX idx_game_participants_user ON game_participants(user_id);
CREATE INDEX idx_game_participants_socket ON game_participants(socket_id);
CREATE INDEX idx_game_participants_connected ON game_participants(game_session_id, is_connected);

-- ============================================================================
-- 9. PARTICIPANT_ANSWERS TABLE
-- ============================================================================
-- Individual answer submissions from players
-- Tracks exactly what answer was selected and when
-- Enables answer locking (one answer per question per player)
-- ============================================================================
CREATE TABLE IF NOT EXISTS participant_answers (
  id SERIAL PRIMARY KEY,
  participant_id INT NOT NULL REFERENCES game_participants(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  answer_id INT NOT NULL REFERENCES answers(id) ON DELETE RESTRICT,
  is_correct BOOLEAN NOT NULL,  -- Denormalized for performance (calculated from answers.is_correct)
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (participant_id, question_id)  -- Player can only answer each question once
);

-- Indexes for answer retrieval and statistics
CREATE INDEX idx_participant_answers_participant ON participant_answers(participant_id);
CREATE INDEX idx_participant_answers_question ON participant_answers(question_id);
CREATE INDEX idx_participant_answers_session_question ON participant_answers(participant_id, question_id);

-- ============================================================================
-- 10. USER_SESSIONS TABLE
-- ============================================================================
-- Session tokens for authentication (JWT alternative)
-- Enables stateless authentication with token-based access
-- Auto-cleanup via expires_at timestamp
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for session validation and cleanup
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATING updated_at TIMESTAMPS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to questions table
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to quizzes table
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA - Default Admin Account
-- ============================================================================
-- Create default admin user (password should be changed immediately)
-- Default password: 'admin123' (hashed with bcrypt)
-- In production, this should be set via environment variables
-- ============================================================================
INSERT INTO users (username, password_hash, account_type)
VALUES (
  'admin',
  '$2b$10$rKzF5EqZQZZ5Z5Z5Z5Z5Ze5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Ze',  -- Placeholder: Replace with actual bcrypt hash
  'admin'
) ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- USEFUL VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Complete quiz with all questions and answers
CREATE OR REPLACE VIEW quiz_full_details AS
SELECT
  q.id AS quiz_id,
  q.title AS quiz_title,
  q.description AS quiz_description,
  q.answer_display_timeout,
  qq.question_order,
  qs.id AS question_id,
  qs.question_text,
  qs.question_type,
  a.id AS answer_id,
  a.answer_text,
  a.is_correct,
  a.display_order
FROM quizzes q
JOIN quiz_questions qq ON q.id = qq.quiz_id
JOIN questions qs ON qq.question_id = qs.id
JOIN answers a ON qs.id = a.question_id
WHERE q.is_active = TRUE
ORDER BY q.id, qq.question_order, a.display_order;

-- View: Active game sessions with participant counts
CREATE OR REPLACE VIEW active_sessions_summary AS
SELECT
  gs.id AS session_id,
  gs.room_code,
  gs.status,
  gs.created_at,
  q.title AS quiz_title,
  COUNT(gp.id) AS total_participants,
  COUNT(gp.id) FILTER (WHERE gp.is_connected = TRUE) AS connected_participants
FROM game_sessions gs
JOIN quizzes q ON gs.quiz_id = q.id
LEFT JOIN game_participants gp ON gs.id = gp.game_session_id
WHERE gs.status = 'in_progress'
GROUP BY gs.id, gs.room_code, gs.status, gs.created_at, q.title
ORDER BY gs.created_at DESC;

-- View: Participant performance in sessions
CREATE OR REPLACE VIEW participant_performance AS
SELECT
  gp.id AS participant_id,
  gp.display_name,
  gs.room_code,
  q.title AS quiz_title,
  COUNT(pa.id) AS total_answers,
  COUNT(pa.id) FILTER (WHERE pa.is_correct = TRUE) AS correct_answers,
  ROUND(100.0 * COUNT(pa.id) FILTER (WHERE pa.is_correct = TRUE) / NULLIF(COUNT(pa.id), 0), 2) AS accuracy_percentage,
  gp.score
FROM game_participants gp
JOIN game_sessions gs ON gp.game_session_id = gs.id
JOIN quizzes q ON gs.quiz_id = q.id
LEFT JOIN participant_answers pa ON gp.id = pa.participant_id
GROUP BY gp.id, gp.display_name, gs.room_code, q.title, gp.score
ORDER BY gp.score DESC;

-- ============================================================================
-- SCHEMA VERSION TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_version (
  version VARCHAR(50) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

INSERT INTO schema_version (version, description)
VALUES ('1.0.0', 'Initial fully normalized schema with user authentication support')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
