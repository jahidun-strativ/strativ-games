// One-off: add userId/email to players, enforce unique userId, and clear the
// manually-added roster (players are now created from registrations).
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL ?? process.env.DB_URL);
await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id text`;
await sql`ALTER TABLE players ADD COLUMN IF NOT EXISTS email text`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS players_user_id_unique ON players(user_id)`;
const del = await sql`DELETE FROM players RETURNING id`;
console.log(`Columns ensured. Cleared ${del.length} existing players.`);
