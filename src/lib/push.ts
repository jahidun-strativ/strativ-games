import "server-only";
import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@strativ.se";

export const pushConfigured = Boolean(publicKey && privateKey);

let ready = false;
function configure() {
  if (ready || !pushConfigured) return;
  webpush.setVapidDetails(subject, publicKey!, privateKey!);
  ready = true;
}

export type PushPayload = { title: string; body: string; url?: string };

// Sends a notification to every stored subscription; prunes expired ones.
export async function sendPushToAll(payload: PushPayload) {
  if (!pushConfigured) return;
  configure();

  const subs = await db.select().from(pushSubscriptions);
  if (subs.length === 0) return;

  const data = JSON.stringify(payload);
  const stale: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) stale.push(s.endpoint);
      }
    }),
  );

  if (stale.length > 0) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, stale));
  }
}

// Sends to every device a single user has registered (by userId). Prunes any
// expired subscriptions it hits. Used e.g. to notify someone they've been made
// an admin. No-op if the user has no subscriptions.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!pushConfigured) return;
  configure();

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
  if (subs.length === 0) return;

  const data = JSON.stringify(payload);
  const stale: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) stale.push(s.endpoint);
      }
    }),
  );

  if (stale.length > 0) {
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.endpoint, stale));
  }
}

// Sends to the subscriptions of a single device/endpoint (e.g. a catch-up push
// when a user first enables notifications).
export async function sendPushToEndpoint(endpoint: string, payload: PushPayload) {
  if (!pushConfigured) return;
  configure();
  const [sub] = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));
  if (!sub) return;
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
  } catch (err) {
    const code = (err as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    }
  }
}
