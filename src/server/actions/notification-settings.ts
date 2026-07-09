"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notificationSettings } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
import { getNotificationSettings } from "@/server/queries/notification-settings";

export async function updateNotificationSettings(settings: {
  notifyOnCreate: boolean;
  notifyDayBefore: boolean;
  notifyHourBefore: boolean;
}) {
  await requireAdmin();
  const current = await getNotificationSettings();
  await db
    .update(notificationSettings)
    .set({ ...settings, updatedAt: new Date() })
    .where(eq(notificationSettings.id, current.id));
  revalidatePath("/account/settings");
}
