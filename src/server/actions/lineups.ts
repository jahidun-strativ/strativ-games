"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { lineupSlots, lineups } from "@/db/schema";
import { requireUser } from "@/server/auth";

export type LineupSlotInput = {
  slotIndex: number;
  positionLabel: string;
  playerId: string | null;
};

export async function saveLineup(
  teamId: string,
  formation: string,
  slots: LineupSlotInput[],
) {
  await requireUser();

  const [lineup] = await db
    .insert(lineups)
    .values({ teamId, formation, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: lineups.teamId,
      set: { formation, updatedAt: new Date() },
    })
    .returning();

  await db.delete(lineupSlots).where(eq(lineupSlots.lineupId, lineup.id));
  if (slots.length > 0) {
    await db.insert(lineupSlots).values(
      slots.map((slot) => ({
        lineupId: lineup.id,
        slotIndex: slot.slotIndex,
        positionLabel: slot.positionLabel,
        playerId: slot.playerId,
      })),
    );
  }

  revalidatePath(`/teams/${teamId}`);
  revalidatePath(`/teams/${teamId}/lineup`);
}
