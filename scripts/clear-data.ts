// Deletes ALL app data (sports, teams, players, staff, venues, matches, stats,
// lineups) in FK-safe order. Auth users are not touched. Run: npx tsx scripts/clear-data.ts
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";

const url = process.env.DATABASE_URL ?? process.env.DB_URL;
if (!url) throw new Error("Set DATABASE_URL (or DB_URL) in .env");
const db = drizzle(neon(url), { schema });

async function main() {
  const tables = [
    ["player_match_stats", schema.playerMatchStats],
    ["lineup_slots", schema.lineupSlots],
    ["lineups", schema.lineups],
    ["matches", schema.matches],
    ["staff", schema.staff],
    ["players", schema.players],
    ["teams", schema.teams],
    ["venues", schema.venues],
    ["sports", schema.sports],
  ] as const;

  for (const [name, table] of tables) {
    const deleted = await db.delete(table).returning();
    console.log(`Cleared ${name}: ${deleted.length} rows`);
  }
  console.log("Done — database is empty and ready for real data.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
