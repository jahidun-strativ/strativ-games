-- Per-match squad membership (who plays for a team in a specific match),
-- independent of the persistent team roster.
-- Additive & idempotent. Apply with:
--   node scripts/run-migration.mjs scripts/migrations/003-match-squads.sql

CREATE TABLE IF NOT EXISTS match_squad_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_squad_players_match_team_player_unique UNIQUE (match_id, team_id, player_id)
);
