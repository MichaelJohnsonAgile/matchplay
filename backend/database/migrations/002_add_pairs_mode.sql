-- Migration: Add Pairs Mode Support
-- Pairs mode reuses the existing teams infrastructure (teams of 2)

-- 1. Update format constraint to include 'pairs'
-- Note: PostgreSQL doesn't have a direct way to modify CHECK constraints,
-- so we drop and recreate it
ALTER TABLE gamedays DROP CONSTRAINT IF EXISTS gamedays_format_check;
ALTER TABLE gamedays ADD CONSTRAINT gamedays_format_check 
  CHECK (format IN ('group', 'teams', 'pairs'));

-- 2. Verify the constraint was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'gamedays_format_check'
    ) THEN
        RAISE NOTICE 'Pairs mode constraint added successfully';
    ELSE
        RAISE EXCEPTION 'Failed to add pairs mode constraint';
    END IF;
END $$;

