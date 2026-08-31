"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { requireAdmin, requireTeamManager } from "@/server/auth";
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

// Team staff (a teamId) may be managed by that team's admin/captain/manager;
// Strativ-wide staff (no team) stays admin-only.
async function requireStaffManager(teamId: string | null) {
  if (teamId) await requireTeamManager(teamId);
  else await requireAdmin();
}

function revalidateStaff(teamId: string | null) {
  revalidatePath("/staff");
  revalidatePath("/league/teams");
  if (teamId) revalidatePath(`/teams/${teamId}`);
}

export async function createStaff(formData: FormData) {
  const values = staffValues(formData);
  await requireStaffManager(values.teamId);
  await db.insert(staff).values(values);
  revalidateStaff(values.teamId);
}

export async function updateStaff(id: string, formData: FormData) {
  const existing = await db.query.staff.findFirst({ where: eq(staff.id, id) });
  if (!existing) throw new Error("Staff member not found.");
  const values = staffValues(formData);
  // Must manage the current team; only an admin may move staff between teams.
  await requireStaffManager(existing.teamId);
  if (values.teamId !== existing.teamId) await requireAdmin();
  await db.update(staff).set(values).where(eq(staff.id, id));
  revalidateStaff(existing.teamId);
  revalidateStaff(values.teamId);
}

export async function deleteStaff(id: string) {
  const existing = await db.query.staff.findFirst({ where: eq(staff.id, id) });
  if (!existing) throw new Error("Staff member not found.");
  await requireStaffManager(existing.teamId);
  await db.delete(staff).where(eq(staff.id, id));
  revalidateStaff(existing.teamId);
}
