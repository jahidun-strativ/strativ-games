import "dotenv/config";
import { neon } from "@neondatabase/serverless";

// Additive migration: teams get a manager_user_id (an app user an admin puts in
// charge of the team, with captain-level powers). Safe to re-run.
const url = process.env.DATABASE_URL ?? process.env.DB_URL;
if (!url) throw new Error("Set DATABASE_URL (or DB_URL) in .env");
const sql = neon(url);

async function main() {
  await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS manager_user_id text`;
  console.log("team-manager migration applied");
}

main();
