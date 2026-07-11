-- Cost split / settle-up: who chips in for a booked slot and who has paid.
-- Additive & idempotent. Apply with:
--   node scripts/run-migration.mjs scripts/migrations/005-session-payments.sql

CREATE TABLE IF NOT EXISTS session_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_payments_session_player_unique UNIQUE (session_id, player_id)
);
