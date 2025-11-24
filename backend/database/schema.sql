-- MatchPlay Database Schema
-- PostgreSQL Database for Pickleball League Management

-- Drop existing tables if they exist (for clean re-initialization)
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS gameday_athletes CASCADE;
DROP TABLE IF EXISTS gamedays CASCADE;
DROP TABLE IF EXISTS athletes CASCADE;

-- Athletes Table
CREATE TABLE athletes (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    rank INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game Days Table
CREATE TABLE gamedays (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    venue VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in-progress', 'completed', 'cancelled')),
    format VARCHAR(20) DEFAULT 'group',
    points_to_win INTEGER DEFAULT 11,
    win_by_margin INTEGER DEFAULT 2,
    number_of_rounds INTEGER DEFAULT 3,
    movement_rule VARCHAR(10) DEFAULT 'auto',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for GameDay Athletes (many-to-many)
CREATE TABLE gameday_athletes (
    gameday_id VARCHAR(50) REFERENCES gamedays(id) ON DELETE CASCADE,
    athlete_id VARCHAR(50) REFERENCES athletes(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (gameday_id, athlete_id)
);

-- Matches Table
CREATE TABLE matches (
    id VARCHAR(50) PRIMARY KEY,
    gameday_id VARCHAR(50) REFERENCES gamedays(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    match_group INTEGER NOT NULL,
    court INTEGER,
    team_a_player1 VARCHAR(50) REFERENCES athletes(id),
    team_a_player2 VARCHAR(50) REFERENCES athletes(id),
    team_a_score INTEGER,
    team_b_player1 VARCHAR(50) REFERENCES athletes(id),
    team_b_player2 VARCHAR(50) REFERENCES athletes(id),
    team_b_score INTEGER,
    bye_athlete VARCHAR(50) REFERENCES athletes(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed')),
    winner VARCHAR(10) CHECK (winner IN ('teamA', 'teamB')),
    timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_athletes_rank ON athletes(rank);
CREATE INDEX idx_athletes_status ON athletes(status);
CREATE INDEX idx_gamedays_date ON gamedays(date);
CREATE INDEX idx_gamedays_status ON gamedays(status);
CREATE INDEX idx_gameday_athletes_gameday ON gameday_athletes(gameday_id);
CREATE INDEX idx_gameday_athletes_athlete ON gameday_athletes(athlete_id);
CREATE INDEX idx_matches_gameday ON matches(gameday_id);
CREATE INDEX idx_matches_round ON matches(round);
CREATE INDEX idx_matches_group ON matches(match_group);
CREATE INDEX idx_matches_status ON matches(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON athletes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gamedays_updated_at BEFORE UPDATE ON gamedays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample athletes (the original 12 from store.js)
INSERT INTO athletes (id, name, email, status, rank) VALUES
    ('ath-1', 'John Smith', 'john@example.com', 'active', 1),
    ('ath-2', 'Sarah Johnson', 'sarah@example.com', 'active', 2),
    ('ath-3', 'Mike Davis', 'mike@example.com', 'active', 3),
    ('ath-4', 'Emily Wilson', 'emily@example.com', 'active', 4),
    ('ath-5', 'David Brown', 'david@example.com', 'active', 5),
    ('ath-6', 'Lisa Anderson', 'lisa@example.com', 'active', 6),
    ('ath-7', 'Tom Martinez', 'tom@example.com', 'active', 7),
    ('ath-8', 'Jennifer Taylor', 'jennifer@example.com', 'active', 8),
    ('ath-9', 'Robert Garcia', 'robert@example.com', 'active', 9),
    ('ath-10', 'Maria Rodriguez', 'maria@example.com', 'active', 10),
    ('ath-11', 'Chris Lee', 'chris@example.com', 'active', 11),
    ('ath-12', 'Amanda White', 'amanda@example.com', 'active', 12);

