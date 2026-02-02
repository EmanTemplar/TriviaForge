-- Migration 09: Question Tags and Archive Support
-- Created: 2026-02-01
-- Description: Adds tagging system for questions (categories, difficulties, custom tags)
--              and soft delete (archive) capability

-- ============================================================================
-- TAGS TABLE
-- ============================================================================

-- Create tags table for categories, difficulties, and custom tags
CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  tag_type VARCHAR(20) NOT NULL,  -- 'category', 'difficulty', 'custom'
  color VARCHAR(7),               -- Hex color for display (#FF5733)
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, tag_type)
);

-- Index for filtering by tag type
CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(tag_type);

-- ============================================================================
-- QUESTION_TAGS JUNCTION TABLE
-- ============================================================================

-- Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS question_tags (
  question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (question_id, tag_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_question_tags_question ON question_tags(question_id);
CREATE INDEX IF NOT EXISTS idx_question_tags_tag ON question_tags(tag_id);

-- ============================================================================
-- QUESTIONS TABLE - ADD ARCHIVE SUPPORT
-- ============================================================================

-- Add is_archived column for soft delete
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Index for filtering out archived questions
CREATE INDEX IF NOT EXISTS idx_questions_archived ON questions(is_archived);

-- ============================================================================
-- SEED DEFAULT TAGS
-- ============================================================================

-- Insert default difficulty tags (if they don't exist)
INSERT INTO tags (name, tag_type, color) VALUES
  ('Easy', 'difficulty', '#22c55e'),
  ('Medium', 'difficulty', '#f59e0b'),
  ('Hard', 'difficulty', '#ef4444')
ON CONFLICT (name, tag_type) DO NOTHING;

-- Insert default category tags (if they don't exist)
INSERT INTO tags (name, tag_type, color) VALUES
  ('Science', 'category', '#3b82f6'),
  ('History', 'category', '#8b5cf6'),
  ('Geography', 'category', '#06b6d4'),
  ('Sports', 'category', '#22c55e'),
  ('Entertainment', 'category', '#ec4899'),
  ('General Knowledge', 'category', '#6b7280'),
  ('Literature', 'category', '#f59e0b'),
  ('Math', 'category', '#ef4444'),
  ('Technology', 'category', '#14b8a6'),
  ('Music', 'category', '#a855f7'),
  ('Art', 'category', '#f97316'),
  ('Food & Drink', 'category', '#84cc16'),
  ('Nature', 'category', '#10b981')
ON CONFLICT (name, tag_type) DO NOTHING;
