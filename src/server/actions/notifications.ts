"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/server/auth";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: string; // ISO — serialisable across the server/client boundary
};

// The signed-in user's inbox, newest first (capped — the tray isn't an archive).
export async function listNotifications(): Promise<NotificationItem[]> {
  const user = await requireUser();
  const rows = await db.query.notifications.findMany({
    where: (n, { eq: e }) => e(n.userId, user.id),
    orderBy: desc(notifications.createdAt),
    limit: 30,
  });
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    url: n.url,
    read: n.readAt != null,
    createdAt: n.createdAt.toISOString(),
  }));
}

// Just the unread badge count — cheap, polled by the bell.
export async function getUnreadCount(): Promise<number> {
  const user = await requireUser();
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  return rows.length;
}

export async function markNotificationRead(id: string) {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
}
