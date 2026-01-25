-- ============================================================================
-- Migration 06: Add media fields to questions
-- ============================================================================
-- Adds support for images in questions
-- image_url: Path to uploaded file or external URL
-- image_type: 'upload' for local files, 'url' for external references
-- ============================================================================
-- Created: 2026-01-24
-- Version: v5.0.0b
-- ============================================================================

-- Add image fields to questions table
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_type VARCHAR(20) CHECK (image_type IN ('upload', 'url', NULL));

-- Add index for queries filtering by image presence (useful for stats/filtering)
CREATE INDEX IF NOT EXISTS idx_questions_has_image ON questions ((image_url IS NOT NULL));

-- Update schema version
INSERT INTO schema_version (version, description)
VALUES ('1.0.6', 'Add media fields to questions (image_url, image_type)')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
