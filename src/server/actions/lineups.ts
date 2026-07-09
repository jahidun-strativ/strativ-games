"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { lineupSlots, lineups } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { MAX_SQUAD, MAX_SUBS, MIN_SQUAD, MIN_SUBS } from "@/lib/formations";

export type LineupSlotInput = {
  role: "starter" | "sub";
  slotIndex: number;
  positionLabel: string;
  playerId: string | null;
};

export async function saveLineup(
  teamId: string,
  formation: string,
  squadSize: number,
  slots: LineupSlotInput[],
) {
  await requireUser();

  if (squadSize < MIN_SQUAD || squadSize > MAX_SQUAD) {
    throw new Error(`Squad size must be between ${MIN_SQUAD} and ${MAX_SQUAD}.`);
  }
  const subCount = slots.filter((s) => s.role === "sub").length;
  if (subCount < MIN_SUBS || subCount > MAX_SUBS) {
    throw new Error(`Bench must have between ${MIN_SUBS} and ${MAX_SUBS} substitutes.`);
  }

  const [lineup] = await db
    .insert(lineups)
    .values({ teamId, formation, squadSize, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: lineups.teamId,
      set: { formation, squadSize, updatedAt: new Date() },
    })
    .returning();

  await db.delete(lineupSlots).where(eq(lineupSlots.lineupId, lineup.id));
  if (slots.length > 0) {
    await db.insert(lineupSlots).values(
      slots.map((slot) => ({
        lineupId: lineup.id,
        role: slot.role,
        slotIndex: slot.slotIndex,
        positionLabel: slot.positionLabel,
        playerId: slot.playerId,
      })),
    );
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}/lineup`);
}
