-- Migration 003: Add Matchmaking Tables
-- Adds player availability and match invitation tracking for Padel matchmaking

-- Weekly availability slots: players declare when they can play each week
CREATE TABLE IF NOT EXISTS availability (
    id VARCHAR(50) PRIMARY KEY,
    athlete_id VARCHAR(50) NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, ... 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT availability_time_order CHECK (end_time > start_time),
    UNIQUE (athlete_id, day_of_week, start_time)
);

-- Match invitations: proposed matches for 4 players (Padel doubles)
CREATE TABLE IF NOT EXISTS match_invitations (
    id VARCHAR(50) PRIMARY KEY,
    proposed_date DATE NOT NULL,
    proposed_start_time TIME NOT NULL,
    proposed_end_time TIME NOT NULL,
    venue VARCHAR(255) DEFAULT 'TBD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined', 'expired')),
    -- Four players for a Padel doubles match
    player1_id VARCHAR(50) REFERENCES athletes(id),
    player2_id VARCHAR(50) REFERENCES athletes(id),
    player3_id VARCHAR(50) REFERENCES athletes(id),
    player4_id VARCHAR(50) REFERENCES athletes(id),
    -- Each player's response
    player1_response VARCHAR(10) DEFAULT 'pending' CHECK (player1_response IN ('pending', 'accepted', 'declined')),
    player2_response VARCHAR(10) DEFAULT 'pending' CHECK (player2_response IN ('pending', 'accepted', 'declined')),
    player3_response VARCHAR(10) DEFAULT 'pending' CHECK (player3_response IN ('pending', 'accepted', 'declined')),
    player4_response VARCHAR(10) DEFAULT 'pending' CHECK (player4_response IN ('pending', 'accepted', 'declined')),
    -- Skill balance info (average rank difference between teams)
    skill_balance_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_availability_athlete ON availability(athlete_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON match_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_date ON match_invitations(proposed_date);
CREATE INDEX IF NOT EXISTS idx_invitations_player1 ON match_invitations(player1_id);
CREATE INDEX IF NOT EXISTS idx_invitations_player2 ON match_invitations(player2_id);
CREATE INDEX IF NOT EXISTS idx_invitations_player3 ON match_invitations(player3_id);
CREATE INDEX IF NOT EXISTS idx_invitations_player4 ON match_invitations(player4_id);

-- Trigger for availability updated_at
CREATE TRIGGER update_availability_updated_at BEFORE UPDATE ON availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for match_invitations updated_at
CREATE TRIGGER update_match_invitations_updated_at BEFORE UPDATE ON match_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
