// One-off: create ONLY the notifications table + its index, additively.
// Avoids `drizzle-kit push`, which wanted to reconcile unrelated schema drift
// (an app_users unique constraint) and prompted to truncate app_users — never.
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL ?? process.env.DB_URL;
if (!url) throw new Error("Set DATABASE_URL (or DB_URL) in .env");

const sql = neon(url);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL,
      type text NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      url text,
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS notifications_user_created_idx
      ON notifications (user_id, created_at)
  `;
  console.log("✓ notifications table ready");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
