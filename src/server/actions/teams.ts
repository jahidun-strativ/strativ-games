"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { players, teams } from "@/db/schema";
import { requireAdmin, requireTeamManager } from "@/server/auth";
import { sendPushToUser } from "@/lib/push";
import { recordAudit } from "@/server/audit";
import { opt, str } from "@/server/form";

// Formation is not set here: new teams take the schema default ("4-4-2") and
// admins change it in the lineup builder, so it survives edits untouched.
function teamValues(formData: FormData) {
  return {
    sportId: str(formData, "sportId"),
    name: str(formData, "name"),
    kind: opt(formData, "kind") === "external" ? "external" : "internal",
    league: opt(formData, "league"),
  };
}

export async function createTeam(formData: FormData) {
  await requireAdmin();
  const values = teamValues(formData);
  const [row] = await db.insert(teams).values(values).returning({ id: teams.id });
  await recordAudit({
    action: "team.create",
    entity: "team",
    entityId: row?.id,
    summary: `Created team ${values.name}`,
  });
  revalidatePath("/teams");
  revalidatePath("/");
}

// Team details (name/sport/kind/league). Admin, captain or manager of the team.
// ponytail: managers can change sport/kind here too (their own team, trusted);
// split into a constrained form if that ever needs locking down.
export async function updateTeam(id: string, formData: FormData) {
  await requireTeamManager(id);
  const values = teamValues(formData);
  await db.update(teams).set(values).where(eq(teams.id, id));
  await recordAudit({
    action: "team.update",
    entity: "team",
    entityId: id,
    summary: `Updated team ${values.name}`,
  });
  revalidatePath("/teams");
  revalidatePath(`/teams/${id}`);
  revalidatePath("/league/teams");
}

export async function deleteTeam(id: string) {
  await requireAdmin();
  const team = await db.query.teams.findFirst({ where: eq(teams.id, id), columns: { name: true } });
  await db.delete(teams).where(eq(teams.id, id));
  await recordAudit({
    action: "team.delete",
    entity: "team",
    entityId: id,
    summary: `Deleted team ${team?.name ?? id}`,
  });
  revalidatePath("/teams");
  revalidatePath("/");
  redirect("/teams");
}

// Save a team's generated-banner seed (admin "shuffle → save"). No image is
// stored — just the seed that drives the procedural banner.
export async function setTeamBanner(teamId: string, seed: number) {
  await requireTeamManager(teamId);
  await db
    .update(teams)
    .set({ bannerSeed: Math.trunc(seed) })
    .where(eq(teams.id, teamId));
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  revalidatePath("/league/teams");
}

// Set a team's designated goalkeepers (zero or more). Admin, captain or manager.
// Every GK must be a player on this team; the Best GK award and the live-scorecard
// save picker read this list.
export async function setTeamGoalkeepers(teamId: string, playerIds: string[]) {
  await requireTeamManager(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team) throw new Error("Team not found.");

  const ids = [...new Set(playerIds)];
  if (ids.length > 0) {
    const onTeam = await db.query.players.findMany({
      where: and(inArray(players.id, ids), eq(players.teamId, teamId)),
      columns: { id: true },
    });
    if (onTeam.length !== ids.length) {
      throw new Error("Every goalkeeper must be a player on this team.");
    }
  }

  await db.update(teams).set({ goalkeeperIds: ids }).where(eq(teams.id, teamId));
  await recordAudit({
    action: "team.goalkeepers.set",
    entity: "team",
    entityId: teamId,
    summary: `Set ${team.name} goalkeepers (${ids.length})`,
  });
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  revalidatePath("/league/teams");
  revalidatePath("/league");
}

// Assign (or clear, with playerId=null) a team's captain. Admin, captain or
// manager. The captain must be a player currently on this team. Notifies them.
export async function setTeamCaptain(teamId: string, playerId: string | null) {
  await requireTeamManager(teamId);

  const team = await db.query.teams.findFirst({ where: eq(teams.id, teamId) });
  if (!team) throw new Error("Team not found.");

  let captain:
    | { id: string; name: string; userId: string | null; teamId: string | null }
    | undefined;
  if (playerId) {
    captain = await db.query.players.findFirst({
      where: eq(players.id, playerId),
      columns: { id: true, name: true, userId: true, teamId: true },
    });
    if (!captain) throw new Error("Player not found.");
    if (captain.teamId !== teamId) {
      throw new Error("The captain must be a player on this team.");
    }
  }

  const changed = team.captainId !== (playerId ?? null);
  await db.update(teams).set({ captainId: playerId }).where(eq(teams.id, teamId));
  await recordAudit({
    action: "team.captain.set",
    entity: "team",
    entityId: teamId,
    summary: captain ? `Made ${captain.name} captain of ${team.name}` : `Cleared ${team.name} captain`,
  });
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  revalidatePath("/league/teams");

  // Let a newly-appointed captain know (best-effort; never fails the action).
  if (changed && captain?.userId) {
    try {
      await sendPushToUser(captain.userId, {
        title: `You're the captain of ${team.name} 🧢`,
        body: "You can now set match lineups and manage the squad on Strativ Games.",
        url: `/teams/${teamId}`,
      });
    } catch {
      // ignore
    }
  }
}

// Assign (or clear, with userId=null) a team's manager. Admin-only — a manager
// can't perpetuate themselves. The manager gets captain-level powers over the
// team (roster, lineups, staff, details). Notifies the new manager.
export async function setTeamManager(teamId: string, userId: string | null) {
  await requireAdmin();

  const team = await db.query.teams.findFirst({
    where: eq(teams.id, teamId),
    columns: { id: true, name: true, managerUserId: true },
  });
  if (!team) throw new Error("Team not found.");

  const changed = team.managerUserId !== (userId ?? null);
  await db.update(teams).set({ managerUserId: userId }).where(eq(teams.id, teamId));
  await recordAudit({
    action: "team.manager.set",
    entity: "team",
    entityId: teamId,
    summary: userId ? `Assigned a manager to ${team.name}` : `Cleared ${team.name} manager`,
  });
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");
  revalidatePath("/league/teams");

  if (changed && userId) {
    try {
      await sendPushToUser(userId, {
        title: `You're managing ${team.name} 📋`,
        body: "You can now manage the roster, line-ups, staff and team details on Strativ Games.",
        url: `/league/teams`,
      });
    } catch {
      // ignore
    }
  }
}
