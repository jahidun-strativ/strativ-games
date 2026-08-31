"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { matchAvailability, players, teams } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
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

// Shared tail of every "player joined this team" path: tell them, and default
// their RSVP to "in" for the team's upcoming scheduled matches (opt-out;
// existing responses untouched).
async function onboardToTeam(playerId: string, teamId: string) {
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
}

// Assign an existing (unassigned) player to a team — used by the team page's
// "Add player" modal. Admin-only: only admins decide roster membership. Refuses
// to poach a player already on another team.
export async function assignPlayerToTeam(playerId: string, teamId: string) {
  await requireAdmin();
  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  if (!player) throw new Error("Player not found.");
  if (player.teamId && player.teamId !== teamId) {
    throw new Error("That player is already on another team.");
  }
  await db.update(players).set({ teamId }).where(eq(players.id, playerId));
  await onboardToTeam(playerId, teamId);
  revalidatePath("/players");
  revalidatePath(`/teams/${teamId}`);
}

// Move a player to another team (or to free agency with teamId=null). Unlike
// assignPlayerToTeam this *does* poach, so it's admin-only — it's what the
// squad board's drag-and-drop calls.
export async function movePlayerToTeam(playerId: string, teamId: string | null) {
  await requireAdmin();
  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  if (!player) throw new Error("Player not found.");
  if (player.teamId === teamId) return;

  if (teamId) {
    const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
    if (!team) throw new Error("Team not found.");
    if (team.kind === "external") throw new Error("External opponents don't have a roster.");
    if (team.sportId !== player.sportId) {
      throw new Error(`${player.name} doesn't play that sport.`);
    }
  }

  await db.update(players).set({ teamId }).where(eq(players.id, playerId));
  // Leaving a team ends any captaincy of it.
  if (player.teamId) {
    await db
      .update(teams)
      .set({ captainId: null })
      .where(and(eq(teams.id, player.teamId), eq(teams.captainId, playerId)));
    revalidatePath(`/teams/${player.teamId}`);
  }
  if (teamId) {
    await onboardToTeam(playerId, teamId);
    revalidatePath(`/teams/${teamId}`);
  }
  revalidatePath("/players");
  revalidatePath("/teams");
}

// Trade two players between their two teams in one move. Admin-only: it
// mutates two rosters at once, so no single captain can do it unilaterally
// (assignPlayerToTeam deliberately refuses to poach for the same reason).
export async function swapPlayers(playerAId: string, playerBId: string) {
  await requireAdmin();
  if (playerAId === playerBId) throw new Error("Pick two different players.");

  const [a, b] = await Promise.all([
    db.query.players.findFirst({ where: eq(players.id, playerAId) }),
    db.query.players.findFirst({ where: eq(players.id, playerBId) }),
  ]);
  if (!a || !b) throw new Error("Player not found.");
  if (!a.teamId || !b.teamId) throw new Error("Both players must be on a team to swap.");
  if (a.teamId === b.teamId) throw new Error("Those players are already on the same team.");
  if (a.sportId !== b.sportId) throw new Error("Players can only be swapped within the same sport.");

  // ponytail: neon-http has no transactions, so these run sequentially. A
  // failure mid-way leaves both players on the same team — recoverable by
  // hand. Move to a pooled driver if atomicity ever matters here.
  await db.update(players).set({ teamId: b.teamId }).where(eq(players.id, a.id));
  await db.update(players).set({ teamId: a.teamId }).where(eq(players.id, b.id));

  // A captain who leaves loses the captaincy of the team they left.
  for (const p of [a, b]) {
    await db
      .update(teams)
      .set({ captainId: null })
      .where(and(eq(teams.id, p.teamId!), eq(teams.captainId, p.id)));
  }

  const [teamA, teamB] = await Promise.all([
    db.query.teams.findFirst({ where: eq(teams.id, a.teamId), columns: { name: true } }),
    db.query.teams.findFirst({ where: eq(teams.id, b.teamId), columns: { name: true } }),
  ]);
  await notifyPlayers([a.id], {
    type: "assignment",
    title: "🔄 You've been swapped",
    body: `You've moved from ${teamA?.name ?? "your team"} to ${teamB?.name ?? "another team"}.`,
    url: `/teams/${b.teamId}`,
  });
  await notifyPlayers([b.id], {
    type: "assignment",
    title: "🔄 You've been swapped",
    body: `You've moved from ${teamB?.name ?? "your team"} to ${teamA?.name ?? "another team"}.`,
    url: `/teams/${a.teamId}`,
  });

  revalidatePath("/players");
  revalidatePath("/teams");
  revalidatePath(`/teams/${a.teamId}`);
  revalidatePath(`/teams/${b.teamId}`);
}

// Release a player from a team (back to free agent). Admin-only: only admins
// decide roster membership. If the released player was the captain, the
// captaincy is cleared.
export async function removePlayerFromTeam(playerId: string, teamId: string) {
  await requireAdmin();
  await db.update(players).set({ teamId: null }).where(eq(players.id, playerId));
  await db
    .update(teams)
    .set({ captainId: null })
    .where(and(eq(teams.id, teamId), eq(teams.captainId, playerId)));
  revalidatePath("/players");
  revalidatePath(`/teams/${teamId}`);
}
