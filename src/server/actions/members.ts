"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { appUsers } from "@/db/schema";
import { requireAdmin } from "@/server/auth";

export async function setUserRole(userId: string, role: "admin" | "member") {
  await requireAdmin();

  if (role === "member") {
    const [{ admins }] = await db
      .select({ admins: count() })
      .from(appUsers)
      .where(eq(appUsers.role, "admin"));
    const target = await db.query.appUsers.findFirst({
      where: (u) => eq(u.userId, userId),
    });
    if (admins <= 1 && target?.role === "admin") {
      throw new Error("There must be at least one admin.");
    }
  }

  await db.update(appUsers).set({ role }).where(eq(appUsers.userId, userId));
  revalidatePath("/members");
}
