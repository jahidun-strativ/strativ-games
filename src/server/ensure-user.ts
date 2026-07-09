import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers } from "@/db/schema";

type AuthUser = { id: string; email: string };

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Ensures every registered user has an app_users row with a role.
// Admin bootstrap: users listed in ADMIN_EMAILS are always admin; if no
// ADMIN_EMAILS is configured, the very first user becomes the admin.
export async function ensureAppUser(user: AuthUser) {
  const envAdmins = adminEmails();
  const emailIsAdmin = envAdmins.includes(user.email.toLowerCase());

  const existing = await db.query.appUsers.findFirst({
    where: (u) => eq(u.userId, user.id),
  });

  if (existing) {
    if (emailIsAdmin && existing.role !== "admin") {
      await db.update(appUsers).set({ role: "admin" }).where(eq(appUsers.id, existing.id));
    }
    return;
  }

  const [{ admins }] = await db
    .select({ admins: count() })
    .from(appUsers)
    .where(eq(appUsers.role, "admin"));

  const role =
    emailIsAdmin || (envAdmins.length === 0 && admins === 0) ? "admin" : "member";

  await db
    .insert(appUsers)
    .values({ userId: user.id, email: user.email, role })
    .onConflictDoNothing({ target: appUsers.userId });
}
