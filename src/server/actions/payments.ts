"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { players, sessionPayments, sessions, teams } from "@/db/schema";
import { requireAdmin } from "@/server/auth";

async function assertSession(sessionId: string) {
  const s = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    columns: { id: true },
  });
  if (!s) throw new Error("Slot not found.");
}

// Add a player to the slot's cost split. Admin-only (the organiser tracks the bill).
export async function addSessionPayer(sessionId: string, playerId: string) {
  await requireAdmin();
  await assertSession(sessionId);
  await db
    .insert(sessionPayments)
    .values({ sessionId, playerId })
    .onConflictDoNothing();
  revalidatePath(`/sessions/${sessionId}`);
}

// Remove a player from the split.
export async function removeSessionPayer(sessionId: string, playerId: string) {
  await requireAdmin();
  await db
    .delete(sessionPayments)
    .where(and(eq(sessionPayments.sessionId, sessionId), eq(sessionPayments.playerId, playerId)));
  revalidatePath(`/sessions/${sessionId}`);
}

// Mark a payer paid / unpaid.
export async function setPaymentPaid(sessionId: string, playerId: string, paid: boolean) {
  await requireAdmin();
  await db
    .update(sessionPayments)
    .set({ paid, paidAt: paid ? new Date() : null })
    .where(and(eq(sessionPayments.sessionId, sessionId), eq(sessionPayments.playerId, playerId)));
  revalidatePath(`/sessions/${sessionId}`);
}

// Seed the split with every player on the internal teams playing this slot.
// Returns how many were added. Admin-only.
export async function fillSessionPayersFromTeams(sessionId: string) {
  await requireAdmin();
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { fixtures: { columns: { homeTeamId: true, awayTeamId: true } } },
  });
  if (!session) throw new Error("Slot not found.");

  const teamIds = [
    ...new Set(
      session.fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]).filter((x): x is string => !!x),
    ),
  ];
  if (teamIds.length === 0) return 0;

  // Only internal teams have rosters to bill.
  const internal = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(inArray(teams.id, teamIds), eq(teams.kind, "internal")));
  const internalIds = internal.map((t) => t.id);
  if (internalIds.length === 0) return 0;

  const roster = await db
    .select({ id: players.id })
    .from(players)
    .where(inArray(players.teamId, internalIds));
  if (roster.length === 0) return 0;

  await db
    .insert(sessionPayments)
    .values(roster.map((p) => ({ sessionId, playerId: p.id })))
    .onConflictDoNothing();

  revalidatePath(`/sessions/${sessionId}`);
  return roster.length;
}
