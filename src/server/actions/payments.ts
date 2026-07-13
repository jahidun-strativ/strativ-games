"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { sessionPayments, sessions } from "@/db/schema";
import { requireAdmin } from "@/server/auth";

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
