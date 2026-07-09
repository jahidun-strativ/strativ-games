import { cache } from "react";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { isAllowedEmail } from "@/lib/auth/allowed";
import { db } from "@/db";
import { type Role } from "@/db/schema";

// Deduped per request: the layout, isAdmin(), and page guards all share one
// session validation and one role lookup instead of repeating them.
export const getSession = cache(async () => {
  const { data } = await auth.getSession();
  return data ?? null;
});

export const getRole = cache(async (userId: string): Promise<Role> => {
  const row = await db.query.appUsers.findFirst({ where: (u) => eq(u.userId, userId) });
  return (row?.role as Role) ?? "member";
});

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  if (!isAllowedEmail(session.user.email)) {
    throw new Error("Access is restricted to strativ.se accounts.");
  }
  return session.user;
}

// True if the current signed-in user is an admin. Never throws — safe for UI gating.
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session?.user || !isAllowedEmail(session.user.email)) return false;
  return (await getRole(session.user.id)) === "admin";
}

// Guards mutating server actions: only admins may proceed.
export async function requireAdmin() {
  const user = await requireUser();
  if ((await getRole(user.id)) !== "admin") {
    throw new Error("Only admins can make changes.");
  }
  return user;
}
