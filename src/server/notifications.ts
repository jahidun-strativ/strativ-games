import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { appUsers, notifications, players } from "@/db/schema";

export type NotificationType = "match" | "result" | "assignment" | "cost";

type NotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
};

// Insert one notification row per recipient userId (deduped). Silent no-op when
// there are no recipients. Best-effort — callers already did the real work
// (created a match, recorded a result), so a notification failure must not throw.
async function createForUsers(userIds: string[], input: NotificationInput) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return;
  try {
    await db.insert(notifications).values(
      unique.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
        url: input.url ?? null,
      })),
    );
  } catch {
    // ignore — the underlying action has already succeeded
  }
}

// Broadcast to every registered app user (match scheduled, full-time result…).
export async function notifyAllUsers(input: NotificationInput) {
  const rows = await db.select({ userId: appUsers.userId }).from(appUsers);
  await createForUsers(
    rows.map((r) => r.userId),
    input,
  );
}

// Targeted: notify specific players (team assignment, cost due). Players without
// a linked auth account (manually added, never signed in) are skipped.
export async function notifyPlayers(playerIds: string[], input: NotificationInput) {
  const ids = [...new Set(playerIds.filter(Boolean))];
  if (ids.length === 0) return;
  const rows = await db
    .select({ userId: players.userId })
    .from(players)
    .where(inArray(players.id, ids));
  await createForUsers(
    rows.map((r) => r.userId).filter((u): u is string => Boolean(u)),
    input,
  );
}
