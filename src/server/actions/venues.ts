"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { venues } from "@/db/schema";
import { requireUser } from "@/server/auth";
import { opt, optInt, str } from "@/server/form";

function venueValues(formData: FormData) {
  return {
    name: str(formData, "name"),
    address: opt(formData, "address"),
    city: opt(formData, "city"),
    capacity: optInt(formData, "capacity"),
    notes: opt(formData, "notes"),
  };
}

export async function createVenue(formData: FormData) {
  await requireUser();
  await db.insert(venues).values(venueValues(formData));
  revalidatePath("/venues");
}

export async function updateVenue(id: string, formData: FormData) {
  await requireUser();
  await db.update(venues).set(venueValues(formData)).where(eq(venues.id, id));
  revalidatePath("/venues");
  revalidatePath(`/venues/${id}`);
}

export async function deleteVenue(id: string) {
  await requireUser();
  await db.delete(venues).where(eq(venues.id, id));
  revalidatePath("/venues");
  redirect("/venues");
}
