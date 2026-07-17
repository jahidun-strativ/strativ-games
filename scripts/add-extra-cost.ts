// One-off: add the additive extra-cost columns to sessions. Uses direct SQL
// (IF NOT EXISTS) to avoid drizzle-kit push's interactive drift reconciliation.
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL ?? process.env.DB_URL;
if (!url) throw new Error("Set DATABASE_URL (or DB_URL) in .env");

const sql = neon(url);

async function main() {
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS extra_cost integer`;
  await sql`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS extra_cost_note text`;
  console.log("✓ sessions.extra_cost / extra_cost_note ready");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
