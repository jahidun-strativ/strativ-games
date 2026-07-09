// Add kind to teams (internal/external) and matches (internal/competitive).
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL ?? process.env.DB_URL);
await sql`ALTER TABLE teams ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'internal'`;
await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'internal'`;
console.log("Added teams.kind and matches.kind.");
