import "dotenv/config";
import { neon } from "@neondatabase/serverless";

// Additive migration for the system-wide audit log. Safe to re-run.
const url = process.env.DATABASE_URL ?? process.env.DB_URL;
if (!url) throw new Error("Set DATABASE_URL (or DB_URL) in .env");
const sql = neon(url);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_user_id text,
      actor_email text,
      action text NOT NULL,
      entity text,
      entity_id text,
      summary text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at)`;
  console.log("audit-log migration applied");
}

main();
