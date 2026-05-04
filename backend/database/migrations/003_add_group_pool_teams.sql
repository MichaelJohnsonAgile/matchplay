-- Migration: distinguish team rows used for group round-robin pools

ALTER TABLE teams ADD COLUMN IF NOT EXISTS team_kind VARCHAR(20) DEFAULT 'standard';

UPDATE teams t
SET team_kind = 'pair'
FROM gamedays g
WHERE t.gameday_id = g.id AND g.format = 'pairs';

COMMENT ON COLUMN teams.team_kind IS 'standard = teams mode squad, pair = pairs mode, group_pool = group format pool for round 1 draw';
