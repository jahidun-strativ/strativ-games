"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { appUsers } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
import { sendPushToUser } from "@/lib/push";

export async function setUserRole(userId: string, role: "admin" | "member") {
  await requireAdmin();

  const target = await db.query.appUsers.findFirst({
    where: (u) => eq(u.userId, userId),
  });

  if (role === "member") {
    const [{ admins }] = await db
      .select({ admins: count() })
      .from(appUsers)
      .where(eq(appUsers.role, "admin"));
    if (admins <= 1 && target?.role === "admin") {
      throw new Error("There must be at least one admin.");
    }
  }

  await db.update(appUsers).set({ role }).where(eq(appUsers.userId, userId));
  revalidatePath("/members");

  // Let a freshly-promoted admin know (only on the member → admin transition, so
  // re-saving an existing admin doesn't re-notify). Best-effort: a push failure
  // must not fail the role change.
  if (role === "admin" && target && target.role !== "admin") {
    try {
      await sendPushToUser(userId, {
        title: "You're now an admin 🛡️",
        body: "You can now manage matches, teams, players and settings on Strativ Games.",
        url: "/",
      });
    } catch {
      // ignore — role was already updated
    }
  }
}
