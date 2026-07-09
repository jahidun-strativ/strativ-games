"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { players } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
import { opt, optInt, str } from "@/server/form";

function playerValues(formData: FormData) {
  return {
    sportId: str(formData, "sportId"),
    teamId: opt(formData, "teamId"),
    name: str(formData, "name"),
    position: str(formData, "position"),
    squadNumber: optInt(formData, "squadNumber"),
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
