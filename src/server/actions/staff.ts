"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { requireAdmin, requireTeamRunner } from "@/server/auth";
import { opt, str } from "@/server/form";
import { recordAudit } from "@/server/audit";

function staffValues(formData: FormData) {
  return {
    sportId: str(formData, "sportId"),
    teamId: opt(formData, "teamId"),
    name: str(formData, "name"),
    role: str(formData, "role"),
    department: opt(formData, "department"),
  };
}

// Team staff (a teamId) are managed by that team's own captain/manager — NOT
// admin. Strativ-wide staff (no team) stays admin-only.
async function requireStaffManager(teamId: string | null) {
  if (teamId) await requireTeamRunner(teamId);
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
  const [row] = await db.insert(staff).values(values).returning({ id: staff.id });
  await recordAudit({
    action: "staff.create",
    entity: "staff",
    entityId: row?.id,
    summary: `Added staff ${values.name} (${values.role})`,
  });
  revalidateStaff(values.teamId);
}

export async function updateStaff(id: string, formData: FormData) {
  const existing = await db.query.staff.findFirst({ where: eq(staff.id, id) });
  if (!existing) throw new Error("Staff member not found.");
  const values = staffValues(formData);
  // Must run the current team; only an admin may move staff between teams.
  await requireStaffManager(existing.teamId);
  if (values.teamId !== existing.teamId) await requireAdmin();
  await db.update(staff).set(values).where(eq(staff.id, id));
  await recordAudit({
    action: "staff.update",
    entity: "staff",
    entityId: id,
    summary: `Updated staff ${values.name} (${values.role})`,
  });
  revalidateStaff(existing.teamId);
  revalidateStaff(values.teamId);
}

export async function deleteStaff(id: string) {
  const existing = await db.query.staff.findFirst({ where: eq(staff.id, id) });
  if (!existing) throw new Error("Staff member not found.");
  await requireStaffManager(existing.teamId);
  await db.delete(staff).where(eq(staff.id, id));
  await recordAudit({
    action: "staff.delete",
    entity: "staff",
    entityId: id,
    summary: `Removed staff ${existing.name} (${existing.role})`,
  });
  revalidateStaff(existing.teamId);
}
