"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { teams } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
import { opt, str } from "@/server/form";

function teamValues(formData: FormData) {
  return {
    sportId: str(formData, "sportId"),
    name: str(formData, "name"),
    kind: opt(formData, "kind") === "external" ? "external" : "internal",
    league: opt(formData, "league"),
    formation: opt(formData, "formation") ?? "4-4-2",
    stadium: opt(formData, "stadium"),
  };
}

export async function createTeam(formData: FormData) {
  await requireAdmin();
  await db.insert(teams).values(teamValues(formData));
  revalidatePath("/teams");
  revalidatePath("/");
}

export async function updateTeam(id: string, formData: FormData) {
  await requireAdmin();
  await db.update(teams).set(teamValues(formData)).where(eq(teams.id, id));
  revalidatePath("/teams");
  revalidatePath(`/teams/${id}`);
}

export async function deleteTeam(id: string) {
  await requireAdmin();
  await db.delete(teams).where(eq(teams.id, id));
  revalidatePath("/teams");
  revalidatePath("/");
  redirect("/teams");
}
