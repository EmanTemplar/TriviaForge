-- Migration 10: Duplicate Detection Support
-- Adds text_hash column for fast exact-match duplicate detection

-- Add text_hash column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'text_hash'
  ) THEN
    ALTER TABLE questions ADD COLUMN text_hash VARCHAR(32);
  END IF;
END $$;

-- Create index for fast exact-match lookup
CREATE INDEX IF NOT EXISTS idx_questions_text_hash
ON questions(text_hash) WHERE text_hash IS NOT NULL;

-- Backfill existing questions with MD5 hash of normalized text
-- Normalization: lowercase, trim, collapse whitespace
UPDATE questions
SET text_hash = MD5(
  LOWER(
    TRIM(
      REGEXP_REPLACE(question_text, '\s+', ' ', 'g')
    )
  )
)
WHERE text_hash IS NULL AND question_text IS NOT NULL;

-- Add trigger to auto-generate hash on insert/update
CREATE OR REPLACE FUNCTION update_question_text_hash()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.question_text IS NOT NULL THEN
    NEW.text_hash = MD5(
      LOWER(
        TRIM(
          REGEXP_REPLACE(NEW.question_text, '\s+', ' ', 'g')
        )
      )
    );
  ELSE
    NEW.text_hash = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_question_text_hash ON questions;

CREATE TRIGGER trg_question_text_hash
BEFORE INSERT OR UPDATE OF question_text ON questions
FOR EACH ROW
EXECUTE FUNCTION update_question_text_hash();
