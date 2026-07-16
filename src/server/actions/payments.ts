"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { players, sessionPayments, sessions } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
import { deriveSessionPayers } from "@/server/queries/session-costs";
import { notifyPlayers } from "@/server/notifications";
import { sendPushToUser } from "@/lib/push";
import { formatBdt } from "@/lib/format";

// Mark a player paid / unpaid for a slot's cost split. The split membership is
// derived from who PLAYED the slot's games (see queries/session-costs), so a
// sessionPayments row may not exist yet for a payer — upsert it here. This table
// now only records settle-up status, not who's in the split.
export async function setPaymentPaid(sessionId: string, playerId: string, paid: boolean) {
  await requireAdmin();
  const s = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    columns: { id: true },
  });
  if (!s) throw new Error("Slot not found.");

  await db
    .insert(sessionPayments)
    .values({ sessionId, playerId, paid, paidAt: paid ? new Date() : null })
    .onConflictDoUpdate({
      target: [sessionPayments.sessionId, sessionPayments.playerId],
      set: { paid, paidAt: paid ? new Date() : null },
    });

  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/costs");
}

export type RemindResult = { reminded: number; alreadySettled: boolean };

// Nudge only the players who played this slot but haven't paid their share yet.
// Sends a proper payment reminder (push to their devices + in-app inbox) with
// the exact amount owed. Admin-only. No-op message when nobody owes.
export async function remindUnpaidPayers(sessionId: string): Promise<RemindResult> {
  await requireAdmin();
  const slot = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    columns: { id: true, cost: true, paidBy: true },
    with: {
      payments: { columns: { playerId: true, paid: true } },
      fixtures: {
        columns: { id: true },
        with: {
          playerStats: {
            columns: { playerId: true, played: true },
            with: { player: { columns: { name: true } } },
          },
        },
      },
    },
  });
  if (!slot) throw new Error("Slot not found.");
  if (slot.paidBy !== "self" || (slot.cost ?? 0) <= 0) {
    return { reminded: 0, alreadySettled: false };
  }

  const payers = deriveSessionPayers(slot.fixtures, slot.payments);
  if (payers.length === 0) return { reminded: 0, alreadySettled: false };

  const unpaid = payers.filter((p) => !p.paid);
  if (unpaid.length === 0) return { reminded: 0, alreadySettled: true };

  const perHead = Math.round((slot.cost ?? 0) / payers.length);
  const unpaidIds = unpaid.map((p) => p.id);
  const title = "💸 Payment reminder";
  const body = `You still owe ${formatBdt(perHead)} for a match slot. Tap to settle up.`;
  const url = `/sessions/${sessionId}`;

  // In-app inbox for each unpaid player.
  await notifyPlayers(unpaidIds, { type: "cost", title, body, url });

  // Push to each unpaid player's devices (only those with a linked account).
  const rows = await db
    .select({ userId: players.userId })
    .from(players)
    .where(inArray(players.id, unpaidIds));
  const userIds = [...new Set(rows.map((r) => r.userId).filter((u): u is string => Boolean(u)))];
  await Promise.all(userIds.map((uid) => sendPushToUser(uid, { title, body, url }).catch(() => {})));

  return { reminded: unpaid.length, alreadySettled: false };
}
