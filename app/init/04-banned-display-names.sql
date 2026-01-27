-- ============================================================================
-- Banned Display Names Migration
-- ============================================================================
-- Adds support for banning offensive display names globally
-- ============================================================================

-- Create banned_display_names table
CREATE TABLE IF NOT EXISTS banned_display_names (
  id SERIAL PRIMARY KEY,
  pattern VARCHAR(255) NOT NULL,
  pattern_type VARCHAR(50) DEFAULT 'exact' CHECK (pattern_type IN ('exact', 'contains')),
  banned_by INT REFERENCES users(id) ON DELETE SET NULL,  -- Admin who banned it
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast pattern lookups (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_banned_names_pattern ON banned_display_names(LOWER(pattern));
CREATE INDEX IF NOT EXISTS idx_banned_names_type ON banned_display_names(pattern_type);
CREATE INDEX IF NOT EXISTS idx_banned_names_created_at ON banned_display_names(created_at DESC);

-- Update schema version
INSERT INTO schema_version (version, description)
VALUES ('1.1.0', 'Added banned_display_names table for display name filtering')
ON CONFLICT (version) DO NOTHING;
