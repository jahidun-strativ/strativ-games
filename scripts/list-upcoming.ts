import "dotenv/config";
import { db } from "@/db";
import { gte, asc } from "drizzle-orm";
import { matches } from "@/db/schema";

async function main() {
  const now = new Date();
  const rows = await db.query.matches.findMany({
    where: gte(matches.kickoffAt, now),
    orderBy: asc(matches.kickoffAt),
    with: {
      homeTeam: { columns: { name: true, kind: true } },
      awayTeam: { columns: { name: true, kind: true } },
      venue: { columns: { name: true, city: true } },
      sport: { columns: { name: true } },
    },
  });
  console.log(`Now: ${now.toISOString()}`);
  console.log(`Upcoming matches: ${rows.length}\n`);
  for (const m of rows) {
    console.log(JSON.stringify({
      id: m.id,
      kickoffAt: m.kickoffAt,
      status: m.status,
      kind: m.kind,
      title: m.title,
      home: m.homeTeam?.name ?? null,
      away: m.awayTeam?.name ?? null,
      venue: m.venue?.name ?? null,
      city: m.venue?.city ?? null,
      sport: m.sport?.name ?? null,
    }));
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
