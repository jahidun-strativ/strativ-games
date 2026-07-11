"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { players, teams } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
import { sendPushToUser } from "@/lib/push";
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

// Assign (or clear, with playerId=null) a team's captain. Admin-only. The
// captain must be a player currently on this team. Notifies the new captain.
export async function setTeamCaptain(teamId: string, playerId: string | null) {
  await requireAdmin();

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
  revalidatePath(`/teams/${teamId}`);
  revalidatePath("/teams");

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
