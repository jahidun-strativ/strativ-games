// Lineups: add squad_size; lineup_slots: add role + switch the unique key to
// (lineup_id, role, slot_index) so starters and subs can share slot indexes.
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL ?? process.env.DB_URL);

await sql`ALTER TABLE lineups ADD COLUMN IF NOT EXISTS squad_size int NOT NULL DEFAULT 11`;
await sql`ALTER TABLE lineup_slots ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'starter'`;

// Drop the old (lineup_id, slot_index) unique constraint if present.
await sql`ALTER TABLE lineup_slots DROP CONSTRAINT IF EXISTS lineup_slots_lineup_id_slot_index_unique`;
await sql`CREATE UNIQUE INDEX IF NOT EXISTS lineup_slots_lineup_role_slot_unique ON lineup_slots(lineup_id, role, slot_index)`;

console.log("Lineups migrated: squad_size + slot role, composite unique key.");
