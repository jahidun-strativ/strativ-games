import "dotenv/config";
import { neon } from "@neondatabase/serverless";

// Additive migration: per-match defensive tallies (tackles & clearances) on
// player_match_stats, mirroring `saves`. Defenders earn these via live events;
// they roll up here on finalize and feed the Top defenders board. Safe to re-run.
const url = process.env.DATABASE_URL ?? process.env.DB_URL;
if (!url) throw new Error("Set DATABASE_URL (or DB_URL) in .env");
const sql = neon(url);

async function main() {
  await sql`ALTER TABLE player_match_stats ADD COLUMN IF NOT EXISTS tackles integer NOT NULL DEFAULT 0`;
  await sql`ALTER TABLE player_match_stats ADD COLUMN IF NOT EXISTS clearances integer NOT NULL DEFAULT 0`;
  console.log("defender-stats migration applied");
}

main();
