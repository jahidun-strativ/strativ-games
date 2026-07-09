import { eq } from "drizzle-orm";
import { db } from "@/db";
import { players, sports } from "@/db/schema";

type AuthUser = { id: string; email: string; name?: string | null };

// Ensures every registered user has a player record. Called on each app visit;
// inserts once (deduped by userId) and is a no-op thereafter.
export async function ensurePlayerForUser(user: AuthUser) {
  const existing = await db.query.players.findFirst({
    where: (p) => eq(p.userId, user.id),
    columns: { id: true },
  });
  if (existing) return;

  // A player needs a sport (NOT NULL). Use the first sport, or seed a default.
  let sport = await db.query.sports.findFirst();
  if (!sport) {
    [sport] = await db
      .insert(sports)
      .values({
        name: "Football",
        shortName: "FTB",
        color: "#22c55e",
        description: "Strativ football.",
      })
      .returning();
  }

  const name = user.name?.trim() || user.email.split("@")[0];
  await db
    .insert(players)
    .values({
      sportId: sport.id,
      name,
      position: "TBD",
      status: "active",
      userId: user.id,
      email: user.email,
    })
    .onConflictDoNothing({ target: players.userId });
}
