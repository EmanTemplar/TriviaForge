-- Migration 11: Ignored Duplicate Pairs
-- Stores pairs of questions that have been reviewed and marked as "not duplicates"
-- This prevents false positives from appearing in future duplicate scans

-- Create table for ignored pairs
CREATE TABLE IF NOT EXISTS ignored_duplicate_pairs (
  id SERIAL PRIMARY KEY,
  question_id_1 INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_id_2 INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  ignored_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ignored_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  -- Ensure we always store the smaller ID first for consistent lookups
  CONSTRAINT unique_pair UNIQUE (question_id_1, question_id_2),
  CONSTRAINT ordered_pair CHECK (question_id_1 < question_id_2)
);

-- Index for fast lookups when filtering duplicates
CREATE INDEX IF NOT EXISTS idx_ignored_pairs_q1 ON ignored_duplicate_pairs(question_id_1);
CREATE INDEX IF NOT EXISTS idx_ignored_pairs_q2 ON ignored_duplicate_pairs(question_id_2);
