-- Migration: Convert TIMESTAMP columns to TIMESTAMPTZ for proper timezone handling
-- This ensures timestamps are stored with timezone information and displayed correctly

-- Step 1: Drop views that depend on timestamp columns
DROP VIEW IF EXISTS active_sessions_summary CASCADE;
DROP VIEW IF EXISTS participant_performance CASCADE;
DROP VIEW IF EXISTS quiz_full_details CASCADE;

-- Step 2: Convert TIMESTAMP columns to TIMESTAMPTZ
-- Game Sessions table
ALTER TABLE game_sessions
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN completed_at TYPE TIMESTAMPTZ USING completed_at AT TIME ZONE 'UTC';

-- Session Questions table
ALTER TABLE session_questions
  ALTER COLUMN presented_at TYPE TIMESTAMPTZ USING presented_at AT TIME ZONE 'UTC',
  ALTER COLUMN revealed_at TYPE TIMESTAMPTZ USING revealed_at AT TIME ZONE 'UTC';

-- Users table
ALTER TABLE users
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- User Sessions table
ALTER TABLE user_sessions
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN expires_at TYPE TIMESTAMPTZ USING expires_at AT TIME ZONE 'UTC';

-- Questions table
ALTER TABLE questions
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- Answers table
ALTER TABLE answers
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';

-- Quizzes table
ALTER TABLE quizzes
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- Game Participants table
ALTER TABLE game_participants
  ALTER COLUMN joined_at TYPE TIMESTAMPTZ USING joined_at AT TIME ZONE 'UTC';

-- Step 3: Recreate all views
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
