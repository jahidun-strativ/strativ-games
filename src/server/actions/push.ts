"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { notifyUpcomingToEndpoint } from "@/server/notify-match";

export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}) {
  const user = await requireUser();
  const existing = await db.query.pushSubscriptions.findFirst({
    where: (s) => eq(s.endpoint, sub.endpoint),
  });

  await db
    .insert(pushSubscriptions)
    .values({
      userId: user.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: user.id, p256dh: sub.p256dh, auth: sub.auth },
    });

  // First time this device subscribes → catch it up on upcoming matches.
  if (!existing) {
    await notifyUpcomingToEndpoint(sub.endpoint).catch(() => {});
  }
}

export async function removePushSubscription(endpoint: string) {
  await requireUser();
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}
