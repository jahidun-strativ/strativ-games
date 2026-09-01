import "dotenv/config";
import { neon } from "@neondatabase/serverless";

// Additive migration: a transfers log (single transfer or swap) powering the
// league transfer window's feed and its shareable photo cards. Safe to re-run.
const url = process.env.DATABASE_URL ?? process.env.DB_URL;
if (!url) throw new Error("Set DATABASE_URL (or DB_URL) in .env");
const sql = neon(url);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS transfers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      kind text NOT NULL,
      player_id uuid REFERENCES players(id) ON DELETE SET NULL,
      from_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
      to_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
      counterpart_player_id uuid REFERENCES players(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS transfers_created_idx ON transfers (created_at)`;
  console.log("transfers migration applied");
}

main();
