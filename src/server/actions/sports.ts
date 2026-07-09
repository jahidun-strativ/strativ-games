"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { sports } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { opt, str } from "@/server/form";

export async function createSport(formData: FormData) {
  await requireUser();
  await db.insert(sports).values({
    name: str(formData, "name"),
    shortName: str(formData, "shortName").toUpperCase(),
    color: opt(formData, "color") ?? "#E8630A",
    description: opt(formData, "description"),
  });
  revalidatePath("/sports");
  revalidatePath("/");
}

export async function updateSport(id: string, formData: FormData) {
  await requireUser();
  await db
    .update(sports)
    .set({
      name: str(formData, "name"),
      shortName: str(formData, "shortName").toUpperCase(),
      color: opt(formData, "color") ?? "#E8630A",
      description: opt(formData, "description"),
    })
    .where(eq(sports.id, id));
  revalidatePath("/sports");
  revalidatePath("/");
}

export async function deleteSport(id: string) {
  await requireUser();
  await db.delete(sports).where(eq(sports.id, id));
  revalidatePath("/sports");
  revalidatePath("/");
}
