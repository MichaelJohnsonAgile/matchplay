-- Migration: Add Divide & Conquer format

ALTER TABLE gamedays DROP CONSTRAINT IF EXISTS gamedays_format_check;
ALTER TABLE gamedays ADD CONSTRAINT gamedays_format_check
  CHECK (format IN ('group', 'teams', 'pairs', 'divide'));

ALTER TABLE gamedays ADD COLUMN IF NOT EXISTS divide_current_round SMALLINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN gamedays.divide_current_round IS 'Divide & Conquer session: 0=not started, 1-3=active/completed macro round';
