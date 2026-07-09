import { db } from "@/db";
import { notificationSettings, type NotificationSettings } from "@/db/schema";

// Reads the singleton settings row, creating it with defaults if absent.
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const existing = await db.query.notificationSettings.findFirst();
  if (existing) return existing;
  const [created] = await db.insert(notificationSettings).values({}).returning();
  return created;
}
