import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { matchAvailability, players } from "@/db/schema";

// Opt-out RSVP model: when a match gets its teams, every player on those teams
// is seeded as "in" by default — they tap Out/Maybe if they can't make it.
// `onConflictDoNothing` means an existing explicit response is never
// overwritten (safe to call again when teams are re-assigned). External
// opponent teams simply have no players, so they contribute no rows.
export async function seedDefaultAvailability(
  matchId: string,
  teamIds: (string | null | undefined)[],
) {
  const ids = teamIds.filter((t): t is string => Boolean(t));
  if (ids.length === 0) return;

  const roster = await db
    .select({ id: players.id })
    .from(players)
    .where(inArray(players.teamId, ids));
  if (roster.length === 0) return;

  await db
    .insert(matchAvailability)
    .values(roster.map((p) => ({ matchId, playerId: p.id, status: "in" })))
    .onConflictDoNothing();
}
