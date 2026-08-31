import "dotenv/config";
import { neon } from "@neondatabase/serverless";

// Additive-only migration for the live match scorecard feature.
// Safe to re-run: every statement is IF NOT EXISTS.
const url = process.env.DATABASE_URL ?? process.env.DB_URL;
if (!url) throw new Error("Set DATABASE_URL (or DB_URL) in .env");
const sql = neon(url);

async function main() {
  await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS scorer_user_id text`;
  await sql`
    CREATE TABLE IF NOT EXISTS match_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
      kind text NOT NULL,
      team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
      player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      assist_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
      minute integer,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS match_events_match_created_idx
      ON match_events (match_id, created_at)
  `;
  console.log("live-scorecard migration applied");
}

main();
