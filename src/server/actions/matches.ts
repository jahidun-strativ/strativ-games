"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { matches, playerMatchStats, teams } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
import { opt, optInt, str } from "@/server/form";
import { sendPushToAll } from "@/lib/push";
import { formatFull } from "@/lib/format";

function revalidateMatchPages(id?: string) {
  revalidatePath("/matches");
  revalidatePath("/stats");
  revalidatePath("/");
  if (id) revalidatePath(`/matches/${id}`);
}

// Venue + kickoff are the only required fields — sport/teams are optional and
// can be assigned later. When teams are given, they must share one sport.
async function parseMatchInput(formData: FormData) {
  const venueId = str(formData, "venueId");
  const kickoffAt = new Date(str(formData, "kickoffAt"));
  if (Number.isNaN(kickoffAt.getTime())) throw new Error("Invalid kickoff time.");

  const homeTeamId = opt(formData, "homeTeamId");
  const awayTeamId = opt(formData, "awayTeamId");
  let sportId = opt(formData, "sportId");
  const title = opt(formData, "title");
  const notes = opt(formData, "notes");
  const kind = opt(formData, "kind") === "competitive" ? "competitive" : "internal";

  if (homeTeamId && awayTeamId && homeTeamId === awayTeamId) {
    throw new Error("Home and away team must differ.");
  }

  const teamIds = [homeTeamId, awayTeamId].filter(Boolean) as string[];
  if (teamIds.length > 0) {
    const rows = await db.select().from(teams).where(inArray(teams.id, teamIds));
    const teamSports = new Set(rows.map((t) => t.sportId));
    if (teamSports.size > 1) throw new Error("Both teams must be in the same sport.");
    const teamSport = rows[0]?.sportId ?? null;
    if (teamSport) {
      if (sportId && sportId !== teamSport) {
        throw new Error("Selected teams don't belong to the chosen sport.");
      }
      sportId = teamSport;
    }
  }

  return {
    kind,
    sportId: sportId ?? null,
    homeTeamId: homeTeamId ?? null,
    awayTeamId: awayTeamId ?? null,
    title,
    venueId,
    kickoffAt,
    notes,
  };
}

// Fire a Web Push to all subscribers announcing a newly scheduled match.
async function notifyNewMatch(id: string) {
  const m = await db.query.matches.findFirst({
    where: (mm, { eq }) => eq(mm.id, id),
    with: { venue: true, homeTeam: true, awayTeam: true },
  });
  if (!m) return;
  const label =
    m.homeTeam && m.awayTeam
      ? `${m.homeTeam.name} vs ${m.awayTeam.name}`
      : m.title || "New match";
  await sendPushToAll({
    title: "⚽ New match scheduled",
    body: `${label} · ${formatFull(m.kickoffAt)} at ${m.venue.name}`,
    url: `/matches/${m.id}`,
  });
}

async function assertVenueFree(venueId: string, kickoffAt: Date, excludeMatchId?: string) {
  const clash = await db.query.matches.findFirst({
    where: excludeMatchId
      ? and(
          eq(matches.venueId, venueId),
          eq(matches.kickoffAt, kickoffAt),
          ne(matches.id, excludeMatchId),
          ne(matches.status, "cancelled"),
        )
      : and(
          eq(matches.venueId, venueId),
          eq(matches.kickoffAt, kickoffAt),
          ne(matches.status, "cancelled"),
        ),
  });
  if (clash) throw new Error("Venue is already booked at that kickoff time.");
}

export async function createMatch(formData: FormData) {
  await requireAdmin();
  const values = await parseMatchInput(formData);
  await assertVenueFree(values.venueId, values.kickoffAt);
  const [match] = await db.insert(matches).values(values).returning();
  revalidateMatchPages();
  // Don't let a push failure fail the scheduling.
  await notifyNewMatch(match.id).catch(() => {});
}

// Assign/change sport, teams, title, venue or kickoff after creation.
export async function updateMatch(id: string, formData: FormData) {
  await requireAdmin();
  const values = await parseMatchInput(formData);
  await assertVenueFree(values.venueId, values.kickoffAt, id);
  await db.update(matches).set(values).where(eq(matches.id, id));
  revalidateMatchPages(id);
}

export async function rescheduleMatch(id: string, formData: FormData) {
  await requireAdmin();
  const venueId = str(formData, "venueId");
  const kickoffAt = new Date(str(formData, "kickoffAt"));
  if (Number.isNaN(kickoffAt.getTime())) throw new Error("Invalid kickoff time.");
  await assertVenueFree(venueId, kickoffAt, id);
  await db
    .update(matches)
    .set({ venueId, kickoffAt, status: "scheduled" })
    .where(eq(matches.id, id));
  revalidateMatchPages(id);
}

export async function cancelMatch(id: string) {
  await requireAdmin();
  await db.update(matches).set({ status: "cancelled" }).where(eq(matches.id, id));
  revalidateMatchPages(id);
}

export async function deleteMatch(id: string) {
  await requireAdmin();
  await db.delete(matches).where(eq(matches.id, id));
  revalidateMatchPages();
  redirect("/matches");
}

export async function recordResult(id: string, formData: FormData) {
  await requireAdmin();
  const homeScore = optInt(formData, "homeScore") ?? 0;
  const awayScore = optInt(formData, "awayScore") ?? 0;

  await db
    .update(matches)
    .set({ homeScore, awayScore, status: "completed" })
    .where(eq(matches.id, id));

  // Per-player stat rows come in as stat-<playerId>-goals / -assists / -played.
  const statements = [];
  const playerIds = new Set<string>();
  for (const key of formData.keys()) {
    const m = key.match(/^stat-(.+)-(goals|assists|played)$/);
    if (m) playerIds.add(m[1]);
  }
  for (const playerId of playerIds) {
    const goals = optInt(formData, `stat-${playerId}-goals`) ?? 0;
    const assists = optInt(formData, `stat-${playerId}-assists`) ?? 0;
    const played = formData.get(`stat-${playerId}-played`) === "on";
    if (!played && goals === 0 && assists === 0) {
      statements.push(
        db
          .delete(playerMatchStats)
          .where(
            and(eq(playerMatchStats.matchId, id), eq(playerMatchStats.playerId, playerId)),
          ),
      );
      continue;
    }
    statements.push(
      db
        .insert(playerMatchStats)
        .values({ matchId: id, playerId, goals, assists, played: true })
        .onConflictDoUpdate({
          target: [playerMatchStats.matchId, playerMatchStats.playerId],
          set: { goals, assists, played: true },
        }),
    );
  }
  if (statements.length > 0) {
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  }

  revalidateMatchPages(id);
  revalidatePath("/players");
}
