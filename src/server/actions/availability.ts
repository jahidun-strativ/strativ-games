"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { matchAvailability, AVAILABILITY_STATUSES, type AvailabilityStatus } from "@/db/schema";
import { getCurrentPlayer, requireUser } from "@/server/auth";

// A signed-in user sets their own RSVP for a match. Upserts one row per
// (match, player). Anyone with a player profile can respond (regulars and
// free agents volunteering as guests).
export async function setMyAvailability(matchId: string, status: AvailabilityStatus) {
  await requireUser();
  if (!AVAILABILITY_STATUSES.includes(status)) throw new Error("Invalid availability.");

  const player = await getCurrentPlayer();
  if (!player) throw new Error("No player profile is linked to your account yet.");

  await db
    .insert(matchAvailability)
    .values({ matchId, playerId: player.id, status, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [matchAvailability.matchId, matchAvailability.playerId],
      set: { status, updatedAt: new Date() },
    });

  revalidatePath(`/matches/${matchId}`);
}
