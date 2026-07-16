"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { matchAvailability, players, teams } from "@/db/schema";
import { requireAdmin, requireTeamManager } from "@/server/auth";
import { notifyPlayers } from "@/server/notifications";
import { opt, str } from "@/server/form";

function playerValues(formData: FormData) {
  return {
    sportId: str(formData, "sportId"),
    teamId: opt(formData, "teamId"),
    name: str(formData, "name"),
    // Position is optional — anyone can play anywhere in casual games.
    position: opt(formData, "position") ?? "",
    status: opt(formData, "status") ?? "active",
  };
}

export async function createPlayer(formData: FormData) {
  await requireAdmin();
  await db.insert(players).values(playerValues(formData));
  revalidatePath("/players");
}

export async function updatePlayer(id: string, formData: FormData) {
  await requireAdmin();
  await db.update(players).set(playerValues(formData)).where(eq(players.id, id));
  revalidatePath("/players");
  revalidatePath(`/players/${id}`);
}

export async function deletePlayer(id: string) {
  await requireAdmin();
  // A player on a team can't be deleted — release them from the team first.
  // This keeps rosters intact and avoids accidentally removing an active squad
  // member (and, for login-linked players, deleting a record that would just be
  // recreated on their next visit).
  const player = await db.query.players.findFirst({
    where: eq(players.id, id),
    with: { team: { columns: { name: true } } },
  });
  if (!player) throw new Error("Player not found.");
  if (player.teamId) {
    throw new Error(
      `${player.name} is on ${player.team?.name ?? "a team"}. Remove them from the team before deleting.`,
    );
  }
  await db.delete(players).where(eq(players.id, id));
  revalidatePath("/players");
  redirect("/players");
}

// Assign an existing (unassigned) player to a team — used by the team page's
// "Add player" modal. Admin or the team's captain. Refuses to poach a player
// already on another team.
export async function assignPlayerToTeam(playerId: string, teamId: string) {
  await requireTeamManager(teamId);
  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  if (!player) throw new Error("Player not found.");
  if (player.teamId && player.teamId !== teamId) {
    throw new Error("That player is already on another team.");
  }
  await db.update(players).set({ teamId }).where(eq(players.id, playerId));
  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    columns: { name: true },
  });
  await notifyPlayers([playerId], {
    type: "assignment",
    title: "👥 Added to a team",
    body: `You've been added to ${team?.name ?? "a team"}.`,
    url: `/teams/${teamId}`,
  });
  // Opt-out RSVP: joining a team defaults the player to "in" for that team's
  // upcoming scheduled matches (existing responses untouched).
  const upcoming = await db.query.matches.findMany({
    where: (m, { and: a, or, eq: e, gte }) =>
      a(
        e(m.status, "scheduled"),
        gte(m.kickoffAt, new Date()),
        or(e(m.homeTeamId, teamId), e(m.awayTeamId, teamId)),
      ),
    columns: { id: true },
  });
  if (upcoming.length > 0) {
    await db
      .insert(matchAvailability)
      .values(upcoming.map((m) => ({ matchId: m.id, playerId, status: "in" })))
      .onConflictDoNothing();
  }
  revalidatePath("/players");
  revalidatePath(`/teams/${teamId}`);
}

// Release a player from a team (back to free agent). Admin or the team's
// captain. If the released player was the captain, the captaincy is cleared.
export async function removePlayerFromTeam(playerId: string, teamId: string) {
  await requireTeamManager(teamId);
  await db.update(players).set({ teamId: null }).where(eq(players.id, playerId));
  await db
    .update(teams)
    .set({ captainId: null })
    .where(and(eq(teams.id, teamId), eq(teams.captainId, playerId)));
  revalidatePath("/players");
  revalidatePath(`/teams/${teamId}`);
}
