CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  quiz_id INT REFERENCES quizzes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  choices JSONB NOT NULL,
  correct_choice TEXT,
  order_idx INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  quiz_id INT REFERENCES quizzes(id) ON DELETE SET NULL,
  room_code TEXT NOT NULL UNIQUE,
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team TEXT,
  connected BOOLEAN DEFAULT TRUE,
  joined_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  player_id INT REFERENCES players(id) ON DELETE CASCADE,
  question_id INT REFERENCES questions(id) ON DELETE CASCADE,
  choice TEXT,
  is_correct BOOLEAN,
  answered_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_results_snapshots (
  id SERIAL PRIMARY KEY,
  room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
  snapshot JSONB,
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE quizzes ADD COLUMN is_active BOOLEAN DEFAULT FALSE;
