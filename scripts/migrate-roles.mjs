import "dotenv/config";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL ?? process.env.DB_URL);
await sql`
  CREATE TABLE IF NOT EXISTS app_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL UNIQUE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'member',
    created_at timestamptz NOT NULL DEFAULT now()
  )
`;
console.log("app_users table ready.");
