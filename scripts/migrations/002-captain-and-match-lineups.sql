-- Team captains + per-match lineups.
-- Additive & idempotent. Apply with:
--   node scripts/run-migration.mjs scripts/migrations/002-captain-and-match-lineups.sql
-- (The runner splits on ';', so every statement is single-line-terminated —
--  no DO $$ blocks.)

ALTER TABLE teams ADD COLUMN IF NOT EXISTS captain_id uuid;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_captain_id_players_id_fk;
ALTER TABLE teams ADD CONSTRAINT teams_captain_id_players_id_fk FOREIGN KEY (captain_id) REFERENCES players(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS match_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  formation text NOT NULL DEFAULT '4-4-2',
  squad_size integer NOT NULL DEFAULT 11,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT match_lineups_match_id_team_id_unique UNIQUE (match_id, team_id)
);

CREATE TABLE IF NOT EXISTS match_lineup_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_lineup_id uuid NOT NULL REFERENCES match_lineups(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'starter',
  slot_index integer NOT NULL,
  position_label text NOT NULL,
  player_id uuid REFERENCES players(id) ON DELETE SET NULL,
  CONSTRAINT match_lineup_slots_lineup_role_slot_unique UNIQUE (match_lineup_id, role, slot_index)
);
