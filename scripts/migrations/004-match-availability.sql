-- Match availability / RSVP: each player's in/maybe/out for a match.
-- Additive & idempotent. Apply with:
--   node scripts/run-migration.mjs scripts/migrations/004-match-availability.sql

CREATE TABLE IF NOT EXISTS match_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_availability_match_player_unique UNIQUE (match_id, player_id)
);
