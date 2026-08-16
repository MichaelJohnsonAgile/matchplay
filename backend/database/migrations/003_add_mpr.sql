-- MPR (Matchplay Rating) schema additions

ALTER TABLE athletes
  ADD COLUMN IF NOT EXISTS doubles_rating DECIMAL(5,3),
  ADD COLUMN IF NOT EXISTS rating_reliability SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rated_matches_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_updated_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS rating_history (
  id SERIAL PRIMARY KEY,
  athlete_id VARCHAR(50) REFERENCES athletes(id) ON DELETE CASCADE,
  match_id VARCHAR(50) REFERENCES matches(id) ON DELETE CASCADE,
  rating_before DECIMAL(5,3),
  rating_after DECIMAL(5,3),
  delta DECIMAL(5,3),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (athlete_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_rating_history_athlete ON rating_history(athlete_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rating_history_match ON rating_history(match_id);
CREATE INDEX IF NOT EXISTS idx_athletes_doubles_rating ON athletes(doubles_rating DESC NULLS LAST);
