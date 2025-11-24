-- Migration: Add Teams Mode Support

-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id VARCHAR(50) PRIMARY KEY,
    gameday_id VARCHAR(50) REFERENCES gamedays(id) ON DELETE CASCADE,
    team_number INTEGER NOT NULL,
    team_name VARCHAR(100),
    team_color VARCHAR(20), -- 'blue', 'red', 'green', 'yellow'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(gameday_id, team_number)
);

CREATE INDEX IF NOT EXISTS idx_teams_gameday ON teams(gameday_id);

-- 2. Create Team Members Junction Table
CREATE TABLE IF NOT EXISTS team_members (
    team_id VARCHAR(50) REFERENCES teams(id) ON DELETE CASCADE,
    athlete_id VARCHAR(50) REFERENCES athletes(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, athlete_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_athlete ON team_members(athlete_id);

-- 3. Update GameDays Table
-- Add number_of_teams column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gamedays' AND column_name = 'number_of_teams') THEN
        ALTER TABLE gamedays ADD COLUMN number_of_teams INTEGER DEFAULT 2;
    END IF;
END $$;

-- 4. Update Matches Table
-- Add team affiliation columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'team_a_team_id') THEN
        ALTER TABLE matches ADD COLUMN team_a_team_id VARCHAR(50) REFERENCES teams(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'team_b_team_id') THEN
        ALTER TABLE matches ADD COLUMN team_b_team_id VARCHAR(50) REFERENCES teams(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_matches_team_a_team ON matches(team_a_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_b_team ON matches(team_b_team_id);

