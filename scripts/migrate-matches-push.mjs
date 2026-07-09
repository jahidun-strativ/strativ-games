// Matches: make sport/teams optional, add title, switch team/sport FKs to
// ON DELETE SET NULL. Plus create the push_subscriptions table.
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL ?? process.env.DB_URL);

await sql`ALTER TABLE matches ALTER COLUMN sport_id DROP NOT NULL`;
await sql`ALTER TABLE matches ALTER COLUMN home_team_id DROP NOT NULL`;
await sql`ALTER TABLE matches ALTER COLUMN away_team_id DROP NOT NULL`;
await sql`ALTER TABLE matches ADD COLUMN IF NOT EXISTS title text`;

// Recreate the team/sport foreign keys as SET NULL so removing a team/sport
// keeps its matches (teams just become unassigned) instead of cascade-deleting.
for (const [col, ref, refCol] of [
  ["home_team_id", "teams", "matches_home_team_id_teams_id_fk"],
  ["away_team_id", "teams", "matches_away_team_id_teams_id_fk"],
  ["sport_id", "sports", "matches_sport_id_sports_id_fk"],
]) {
  await sql.query(`ALTER TABLE matches DROP CONSTRAINT IF EXISTS ${refCol}`);
  await sql.query(
    `ALTER TABLE matches ADD CONSTRAINT ${refCol} FOREIGN KEY (${col}) REFERENCES ${ref}(id) ON DELETE SET NULL`,
  );
}

await sql`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )
`;

console.log("Matches relaxed (sport/teams optional + title). push_subscriptions ready.");
