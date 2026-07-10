-- Adds venue booking costs + who-paid, and the sessions (booked-slot) model.
-- All additive & safe (no data loss). Run in the Neon SQL editor or psql.
-- Do NOT use `drizzle-kit push --force` — it would offer to truncate app_users.

-- 1) Sessions: a booked slot that holds one or more fixtures.
CREATE TABLE IF NOT EXISTS "sessions" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sport_id"   uuid REFERENCES "sports"("id") ON DELETE SET NULL,
  "venue_id"   uuid NOT NULL REFERENCES "venues"("id") ON DELETE RESTRICT,
  "kind"       text NOT NULL DEFAULT 'internal',
  "title"      text,
  "notes"      text,
  "cost"       integer,
  "paid_by"    text NOT NULL DEFAULT 'office',
  "start_at"   timestamptz NOT NULL,
  "status"     text NOT NULL DEFAULT 'scheduled',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- 2) Venue standard rate (pre-fills a booking's cost).
ALTER TABLE "venues"  ADD COLUMN IF NOT EXISTS "default_cost" integer;

-- 3) Match (fixture) booking cost, who-paid, and session linkage + timing.
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "cost"         integer;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "paid_by"      text NOT NULL DEFAULT 'office';
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "session_id"   uuid REFERENCES "sessions"("id") ON DELETE CASCADE;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "order_index"  integer NOT NULL DEFAULT 0;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "duration_min" integer;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "break_min"    integer;
