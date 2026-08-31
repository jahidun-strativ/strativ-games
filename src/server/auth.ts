import { cache } from "react";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { isAllowedEmail } from "@/lib/auth/allowed";
import { db } from "@/db";
import { matches, players, teams, type Role } from "@/db/schema";

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

// True if the signed-in user is this team's assigned manager. Manager = the app
// user set as the team's managerUserId; they get captain-level powers over the
// team. Never throws — safe for UI gating.
export async function isManagerOf(teamId: string): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    columns: { managerUserId: true },
  });
  return Boolean(team?.managerUserId && team.managerUserId === session.user.id);
}

// True if the user may manage this team (admin, its captain, or its manager). UI gating.
export async function canManageTeam(teamId: string): Promise<boolean> {
  return (await isAdmin()) || (await isCaptainOf(teamId)) || (await isManagerOf(teamId));
}

// True if the user may set this team's match line-ups: its captain or manager.
// Admins assign those two rather than editing line-ups themselves. UI gating.
export async function canSetLineup(teamId: string): Promise<boolean> {
  return (await isCaptainOf(teamId)) || (await isManagerOf(teamId));
}

// Guards team-scoped mutations that admins may also do (roster add/remove):
// admin, the team's captain, or its manager.
export async function requireTeamManager(teamId: string) {
  const user = await requireUser();
  if ((await getRole(user.id)) === "admin") return user;
  if (await isCaptainOf(teamId)) return user;
  if (await isManagerOf(teamId)) return user;
  throw new Error("Only an admin, this team's captain, or its manager can do that.");
}

// True if the user may record THIS match's result: an admin, the captain of
// either team playing, or the person an admin assigned as scorekeeper. UI
// gating — never throws.
export async function canScoreMatch(
  homeTeamId: string | null,
  awayTeamId: string | null,
  scorerUserId?: string | null,
) {
  if (await isAdmin()) return true;
  if (scorerUserId) {
    const session = await getSession();
    if (session?.user?.id === scorerUserId) return true;
  }
  if (homeTeamId && ((await isCaptainOf(homeTeamId)) || (await isManagerOf(homeTeamId))))
    return true;
  if (awayTeamId && ((await isCaptainOf(awayTeamId)) || (await isManagerOf(awayTeamId))))
    return true;
  return false;
}

// Guards result recording: admin, a captain of a participating team, or the
// assigned scorekeeper.
export async function requireMatchScorer(matchId: string) {
  const user = await requireUser();
  if ((await getRole(user.id)) === "admin") return user;
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { homeTeamId: true, awayTeamId: true, scorerUserId: true },
  });
  if (match && (await canScoreMatch(match.homeTeamId, match.awayTeamId, match.scorerUserId)))
    return user;
  throw new Error("Only an admin, a participating captain, or the assigned scorer can do this.");
}

// Guards match line-ups: the team's captain OR its manager. Admins do not get in
// here (they assign the captain/manager instead). An admin who is also the
// captain or manager of this team passes — on that basis, not on being an admin.
export async function requireLineupEditor(teamId: string) {
  await requireUser();
  if (await isCaptainOf(teamId)) return;
  if (await isManagerOf(teamId)) return;
  throw new Error(
    "Only this team's captain or manager can set match line-ups. An admin can assign them.",
  );
}
