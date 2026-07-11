import { cache } from "react";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { isAllowedEmail } from "@/lib/auth/allowed";
import { db } from "@/db";
import { players, teams, type Role } from "@/db/schema";

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

// The player record for the signed-in user (auto-created at sign-in), or null.
// Used to resolve team-captain powers, which are tied to a player, not a role.
export const getCurrentPlayer = cache(async () => {
  const session = await getSession();
  if (!session?.user) return null;
  const row = await db.query.players.findFirst({
    where: eq(players.userId, session.user.id),
    columns: { id: true, teamId: true },
  });
  return row ?? null;
});

// True if the signed-in user captains this team. Captain = the player set as
// the team's captainId. Never throws — safe for UI gating.
export async function isCaptainOf(teamId: string): Promise<boolean> {
  const [player, team] = await Promise.all([
    getCurrentPlayer(),
    db.query.teams.findFirst({ where: eq(teams.id, teamId), columns: { captainId: true } }),
  ]);
  return Boolean(player && team?.captainId && team.captainId === player.id);
}

// True if the user may manage this team (admin, or its captain). UI gating.
export async function canManageTeam(teamId: string): Promise<boolean> {
  return (await isAdmin()) || (await isCaptainOf(teamId));
}

// Guards team-scoped mutations (per-match lineups, roster): admin or captain.
export async function requireTeamManager(teamId: string) {
  const user = await requireUser();
  if ((await getRole(user.id)) === "admin") return user;
  if (await isCaptainOf(teamId)) return user;
  throw new Error("Only an admin or this team's captain can do that.");
}
