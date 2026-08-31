import "dotenv/config";
import { neon } from "@neondatabase/serverless";

// Additive migration: teams get a goalkeeper_ids array, backfilled from the old
// single goalkeeper_id. Safe to re-run. The old column is left in place (unused).
const url = process.env.DATABASE_URL ?? process.env.DB_URL;
if (!url) throw new Error("Set DATABASE_URL (or DB_URL) in .env");
const sql = neon(url);

async function main() {
  await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS goalkeeper_ids uuid[] NOT NULL DEFAULT '{}'`;
  await sql`
    UPDATE teams
      SET goalkeeper_ids = ARRAY[goalkeeper_id]
      WHERE goalkeeper_id IS NOT NULL AND goalkeeper_ids = '{}'
  `;
  console.log("multi-goalkeeper migration applied");
}

main();
