// Adds the real Strativ player roster as free agents (no team assignment).
// Groupings from the original list, for when teams are created later:
//   Team A: Ishtiaq, Tajmirul Islam, Saqibur, Rashed, Md Shamuel, Samss Jubair, Hasan Shahrear
//   Team B: Jahidun Nur Mahee, Bishal, Shahriar Momin, Mehedi Sharif, Shohan, No One, Foysal Toufiqur
//   Team C: Tanmoy, Suvankar, Sadman, Tayef Billah Saad, Rafee Niloy, Sikto, Faysal Ahammed
// Run: npx tsx scripts/add-players.ts
import "dotenv/config";
import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";

const url = process.env.DATABASE_URL ?? process.env.DB_URL;
if (!url) throw new Error("Set DATABASE_URL (or DB_URL) in .env");
const db = drizzle(neon(url), { schema });

const names = [
  // Team A
  "Ishtiaq",
  "Tajmirul Islam",
  "Saqibur",
  "Rashed",
  "Md Shamuel",
  "Samss Jubair",
  "Hasan Shahrear",
  // Team B
  "Jahidun Nur Mahee",
  "Bishal",
  "Shahriar Momin",
  "Mehedi Sharif",
  "Shohan",
  "No One",
  "Foysal Toufiqur",
  // Team C
  "Tanmoy",
  "Suvankar",
  "Sadman",
  "Tayef Billah Saad",
  "Rafee Niloy",
  "Sikto",
  "Faysal Ahammed",
];

async function main() {
  let [football] = await db
    .select()
    .from(schema.sports)
    .where(eq(schema.sports.name, "Football"));

  if (!football) {
    [football] = await db
      .insert(schema.sports)
      .values({
        name: "Football",
        shortName: "FTB",
        color: "#2e6b34",
        description: "Strativ football.",
      })
      .returning();
    console.log("Created sport: Football");
  }

  const existing = await db
    .select({ name: schema.players.name })
    .from(schema.players)
    .where(eq(schema.players.sportId, football.id));
  const existingNames = new Set(existing.map((p) => p.name.toLowerCase()));

  const toInsert = names
    .filter((name) => !existingNames.has(name.toLowerCase()))
    .map((name) => ({
      sportId: football.id,
      teamId: null,
      name,
      position: "TBD",
      status: "active",
    }));

  if (toInsert.length === 0) {
    console.log("All players already exist — nothing to add.");
    return;
  }

  await db.insert(schema.players).values(toInsert);
  console.log(`Added ${toInsert.length} players as free agents.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
