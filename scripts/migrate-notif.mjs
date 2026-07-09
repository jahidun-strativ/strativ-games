import "dotenv/config";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL ?? process.env.DB_URL);
await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS reminded_day_before boolean NOT NULL DEFAULT false`;
await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS reminded_hour_before boolean NOT NULL DEFAULT false`;
await sql`
  CREATE TABLE IF NOT EXISTS notification_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    notify_on_create boolean NOT NULL DEFAULT true,
    notify_day_before boolean NOT NULL DEFAULT true,
    notify_hour_before boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now()
  )
`;
const existing = await sql`select id from notification_settings limit 1`;
if (!existing.length) await sql`insert into notification_settings default values`;
console.log("Notification settings + match reminder columns ready.");
