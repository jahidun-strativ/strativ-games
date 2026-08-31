"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { matchLineupSlots, matchLineups, lineupSlots, lineups } from "@/db/schema";
import { requireTeamRunner } from "@/server/auth";
import { MAX_SQUAD, MIN_SQUAD } from "@/lib/formations";

export type LineupSlotInput = {
  role: "starter" | "sub";
  slotIndex: number;
  positionLabel: string;
  playerId: string | null;
};

function validateLineup(squadSize: number, slots: LineupSlotInput[]) {
  if (squadSize < MIN_SQUAD || squadSize > MAX_SQUAD) {
    throw new Error(`Squad size must be between ${MIN_SQUAD} and ${MAX_SQUAD}.`);
  }
  // Subs are now per-position (at most one backup per starting slot), so a
  // lineup can have anywhere from zero up to one sub per position.
  const subCount = slots.filter((s) => s.role === "sub").length;
  if (subCount > squadSize) {
    throw new Error("Each position can have at most one substitute.");
  }
}

export async function saveLineup(
  teamId: string,
  formation: string,
  squadSize: number,
  slots: LineupSlotInput[],
) {
  await requireTeamRunner(teamId);
  validateLineup(squadSize, slots);

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

// Save a team's lineup for one specific match (its own formation + slots),
// independent of the team's default lineup. Captain-only (admins assign the
// captain but don't set match line-ups).
export async function saveMatchLineup(
  matchId: string,
  teamId: string,
  formation: string,
  squadSize: number,
  slots: LineupSlotInput[],
) {
  await requireTeamRunner(teamId);
  validateLineup(squadSize, slots);

  const [lineup] = await db
    .insert(matchLineups)
    .values({ matchId, teamId, formation, squadSize, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [matchLineups.matchId, matchLineups.teamId],
      set: { formation, squadSize, updatedAt: new Date() },
    })
    .returning();

  await db.delete(matchLineupSlots).where(eq(matchLineupSlots.matchLineupId, lineup.id));
  if (slots.length > 0) {
    await db.insert(matchLineupSlots).values(
      slots.map((slot) => ({
        matchLineupId: lineup.id,
        role: slot.role,
        slotIndex: slot.slotIndex,
        positionLabel: slot.positionLabel,
        playerId: slot.playerId,
      })),
    );
  }

  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/lineup/${teamId}`);
}
