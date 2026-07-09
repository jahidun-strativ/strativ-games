"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
import { opt, str } from "@/server/form";

function staffValues(formData: FormData) {
  return {
    sportId: str(formData, "sportId"),
    teamId: opt(formData, "teamId"),
    name: str(formData, "name"),
    role: str(formData, "role"),
    department: opt(formData, "department"),
  };
}

export async function createStaff(formData: FormData) {
  await requireAdmin();
  await db.insert(staff).values(staffValues(formData));
  revalidatePath("/staff");
}

export async function updateStaff(id: string, formData: FormData) {
  await requireAdmin();
  await db.update(staff).set(staffValues(formData)).where(eq(staff.id, id));
  revalidatePath("/staff");
}

export async function deleteStaff(id: string) {
  await requireAdmin();
  await db.delete(staff).where(eq(staff.id, id));
  revalidatePath("/staff");
}
