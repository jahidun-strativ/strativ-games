"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { players } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
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
  await db.delete(players).where(eq(players.id, id));
  revalidatePath("/players");
  redirect("/players");
}

// Assign an existing (unassigned) player to a team — used by the team page's
// "Add player" modal. Refuses to poach a player already on another team.
export async function assignPlayerToTeam(playerId: string, teamId: string) {
  await requireAdmin();
  const player = await db.query.players.findFirst({ where: eq(players.id, playerId) });
  if (!player) throw new Error("Player not found.");
  if (player.teamId && player.teamId !== teamId) {
    throw new Error("That player is already on another team.");
  }
  await db.update(players).set({ teamId }).where(eq(players.id, playerId));
  revalidatePath("/players");
  revalidatePath(`/teams/${teamId}`);
}
