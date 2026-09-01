"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { matchAvailability, players, teams, transfers } from "@/db/schema";
import { requireAdmin, requireTeamRunner } from "@/server/auth";
import { notifyPlayers } from "@/server/notifications";
import { recordAudit } from "@/server/audit";
import { opt, str } from "@/server/form";

// Admin edits identity + membership only. A player's position is NOT here — it's
// set by the team's captain/manager via setPlayerRole, so admin edits never touch
// (and never wipe) it.
function playerValues(formData: FormData) {
  return {
    sportId: str(formData, "sportId"),
    teamId: opt(formData, "teamId"),
    name: str(formData, "name"),
    status: opt(formData, "status") ?? "active",
  };
}

export async function createPlayer(formData: FormData) {
  await requireAdmin();
  // Position starts blank; the team's captain/manager sets it later.
  const values = playerValues(formData);
  const [row] = await db
    .insert(players)
    .values({ ...values, position: "" })
    .returning({ id: players.id });
  await recordAudit({
    action: "player.create",
    entity: "player",
    entityId: row?.id,
    summary: `Created player ${values.name}`,
  });
  revalidatePath("/players");
}

export async function updatePlayer(id: string, formData: FormData) {
  await requireAdmin();
  const values = playerValues(formData);
  await db.update(players).set(values).where(eq(players.id, id));
  await recordAudit({
    action: "player.update",
    entity: "player",
    entityId: id,
    summary: `Updated player ${values.name}`,
  });
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
  await recordAudit({
    action: "player.delete",
    entity: "player",
    entityId: id,
    summary: `Deleted player ${player.name}`,
  });
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
  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId), columns: { name: true } });
  await recordAudit({
    action: "player.assign",
    entity: "player",
    entityId: playerId,
    summary: `Added ${player.name} to ${team?.name ?? "a team"}`,
  });
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
  const dest = teamId
    ? (await db.query.teams.findFirst({ where: eq(teams.id, teamId), columns: { name: true } }))?.name
    : null;
  // A move TO a team is a transfer worth a card; a release (to free agency) isn't.
  if (teamId) {
    await db.insert(transfers).values({
      kind: "transfer",
      playerId,
      fromTeamId: player.teamId,
      toTeamId: teamId,
    });
  }
  await recordAudit({
    action: "player.move",
    entity: "player",
    entityId: playerId,
    summary: `Moved ${player.name} to ${dest ?? "free agency"}`,
  });
  revalidatePath("/players");
  revalidatePath("/teams");
  revalidatePath("/league/transfers");
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

  // One swap row: (from → to) is A's move; the counterpart B's move is the reverse.
  await db.insert(transfers).values({
    kind: "swap",
    playerId: a.id,
    fromTeamId: a.teamId,
    toTeamId: b.teamId,
    counterpartPlayerId: b.id,
  });

  await recordAudit({
    action: "player.swap",
    entity: "player",
    entityId: a.id,
    summary: `Swapped ${a.name} (${teamA?.name ?? "?"}) with ${b.name} (${teamB?.name ?? "?"})`,
  });
  revalidatePath("/players");
  revalidatePath("/teams");
  revalidatePath(`/teams/${a.teamId}`);
  revalidatePath(`/teams/${b.teamId}`);
  revalidatePath("/league/transfers");
}

// Set a player's role/position within their team. The team's captain or manager
// only — NOT admin: admins decide roster membership, the team's own runners
// configure positions. It never moves the player between teams.
export async function setPlayerRole(playerId: string, role: string) {
  const player = await db.query.players.findFirst({
    where: eq(players.id, playerId),
    columns: { id: true, teamId: true, name: true },
  });
  if (!player) throw new Error("Player not found.");
  if (!player.teamId) throw new Error("This player isn't on a team.");
  await requireTeamRunner(player.teamId);
  const next = role.trim();
  await db.update(players).set({ position: next }).where(eq(players.id, playerId));
  await recordAudit({
    action: "player.position.set",
    entity: "player",
    entityId: playerId,
    summary: `Set ${player.name}'s position to ${next || "—"}`,
  });
  revalidatePath("/league/teams");
  revalidatePath(`/teams/${player.teamId}`);
  revalidatePath("/players");
  revalidatePath(`/players/${playerId}`);
}

// Release a player from a team (back to free agent). Admin-only: only admins
// decide roster membership. If the released player was the captain, the
// captaincy is cleared.
export async function removePlayerFromTeam(playerId: string, teamId: string) {
  await requireAdmin();
  const [player, team] = await Promise.all([
    db.query.players.findFirst({ where: eq(players.id, playerId), columns: { name: true } }),
    db.query.teams.findFirst({ where: eq(teams.id, teamId), columns: { name: true } }),
  ]);
  await db.update(players).set({ teamId: null }).where(eq(players.id, playerId));
  await db
    .update(teams)
    .set({ captainId: null })
    .where(and(eq(teams.id, teamId), eq(teams.captainId, playerId)));
  await recordAudit({
    action: "player.release",
    entity: "player",
    entityId: playerId,
    summary: `Released ${player?.name ?? "a player"} from ${team?.name ?? "a team"}`,
  });
  revalidatePath("/players");
  revalidatePath(`/teams/${teamId}`);
}
