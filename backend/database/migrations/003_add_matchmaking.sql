-- Migration 003: Add matchmaking tables
-- Users (linked to Supabase Auth via UUID)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,                      -- matches Supabase auth.users.id
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  skill_level TEXT CHECK (skill_level IN ('beginner', 'intermediate', 'advanced', 'pro')) DEFAULT 'intermediate',
  preferred_lat NUMERIC(9,6),
  preferred_lng NUMERIC(9,6),
  preferred_location_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player availability slots: "I am free on date X between time A and B"
CREATE TABLE IF NOT EXISTS player_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL,
  venue_id TEXT,                            -- Playtomic tenant_id (optional preference)
  venue_name TEXT,
  status TEXT CHECK (status IN ('open', 'matched', 'cancelled')) DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Match invitations: player A invites player B for a specific slot
CREATE TABLE IF NOT EXISTS match_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requester_availability_id UUID REFERENCES player_availability(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')) DEFAULT 'pending',
  proposed_date DATE NOT NULL,
  proposed_time_start TIME NOT NULL,
  proposed_time_end TIME NOT NULL,
  proposed_venue_id TEXT,                   -- Playtomic tenant_id
  proposed_venue_name TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_invite CHECK (requester_id != invitee_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_player_availability_user_id ON player_availability(user_id);
CREATE INDEX IF NOT EXISTS idx_player_availability_date ON player_availability(date);
CREATE INDEX IF NOT EXISTS idx_player_availability_status ON player_availability(status);
CREATE INDEX IF NOT EXISTS idx_match_requests_requester ON match_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_match_requests_invitee ON match_requests(invitee_id);
CREATE INDEX IF NOT EXISTS idx_match_requests_status ON match_requests(status);

-- Auto-update updated_at trigger for users
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_player_availability_updated_at') THEN
    CREATE TRIGGER update_player_availability_updated_at
      BEFORE UPDATE ON player_availability
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_match_requests_updated_at') THEN
    CREATE TRIGGER update_match_requests_updated_at
      BEFORE UPDATE ON match_requests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
