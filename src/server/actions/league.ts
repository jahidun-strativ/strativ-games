"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { matches, seasons, sessions, teams } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
import { int, opt, str } from "@/server/form";
import { threeTeamRoundRobin } from "@/server/round-robin";
import { seedDefaultAvailability } from "@/server/seed-availability";
import { notifyLeagueMatchday, notifyLeagueChampion } from "@/server/notify-match";
import { getNotificationSettings } from "@/server/queries/notification-settings";

function revalidateLeague(seasonId?: string) {
  revalidatePath("/league");
  revalidatePath("/matches");
  revalidatePath("/");
  if (seasonId) revalidatePath(`/league/${seasonId}`);
}

/** Start a new season, scoped to a sport (its internal teams are the league). */
export async function createSeason(formData: FormData) {
  await requireAdmin();
  const name = str(formData, "name");
  const sportId = str(formData, "sportId");
  const startAt = new Date(str(formData, "startAt"));
  if (Number.isNaN(startAt.getTime())) throw new Error("Invalid start date.");
  const plannedMatchdays = Math.max(1, int(formData, "plannedMatchdays"));

  const [season] = await db
    .insert(seasons)
    .values({ name, sportId, startAt, plannedMatchdays, status: "active" })
    .returning();
  revalidateLeague(season.id);
  redirect("/league");
}

// A matchday is a booked slot whose 3 internal teams play a round-robin — the
// same shape as an ordinary internal slot, but tagged with the season.
export async function addMatchday(seasonId: string, formData: FormData) {
  await requireAdmin();
  const season = await db.query.seasons.findFirst({ where: eq(seasons.id, seasonId) });
  if (!season) throw new Error("Season not found.");

  const venueId = str(formData, "venueId");
  const startAt = new Date(str(formData, "startAt"));
  if (Number.isNaN(startAt.getTime())) throw new Error("Invalid start time.");

  const internal = await db.query.teams.findMany({
    where: eq(teams.sportId, season.sportId),
    orderBy: asc(teams.createdAt),
  });
  const leagueTeams = internal.filter((t) => t.kind !== "external");
  if (leagueTeams.length !== 3) {
    throw new Error(
      `A matchday round-robin needs exactly 3 internal teams; this sport has ${leagueTeams.length}.`,
    );
  }

  const existing = await db.$count(sessions, eq(sessions.seasonId, seasonId));
  const planned = threeTeamRoundRobin(leagueTeams.map((t) => t.id));

  const [session] = await db
    .insert(sessions)
    .values({
      seasonId,
      sportId: season.sportId,
      venueId,
      kind: "internal",
      title: `Matchday ${existing + 1}`,
      startAt,
      status: "scheduled",
    })
    .returning();

  const fixtures = await db
    .insert(matches)
    .values(
      planned.map((f) => ({
        sessionId: session.id,
        orderIndex: f.orderIndex,
        durationMin: f.durationMin,
        breakMin: f.breakMin,
        sportId: season.sportId,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        kind: "internal" as const,
        venueId,
        kickoffAt: new Date(startAt.getTime() + f.offsetMin * 60_000),
        status: "scheduled" as const,
      })),
    )
    .returning({ id: matches.id, homeTeamId: matches.homeTeamId, awayTeamId: matches.awayTeamId });

  for (const f of fixtures) {
    await seedDefaultAvailability(f.id, [f.homeTeamId, f.awayTeamId]);
  }

  const settings = await getNotificationSettings();
  if (settings.notifyOnCreate) await notifyLeagueMatchday(session.id).catch(() => {});

  revalidateLeague(seasonId);
  redirect(`/sessions/${session.id}`);
}

// Edit an existing season's details. sportId stays fixed — matchdays and the
// league teams are tied to it, so changing it would orphan existing data.
export async function updateSeason(seasonId: string, formData: FormData) {
  await requireAdmin();
  const name = str(formData, "name");
  const startAt = new Date(str(formData, "startAt"));
  if (Number.isNaN(startAt.getTime())) throw new Error("Invalid start date.");
  const plannedMatchdays = Math.max(1, int(formData, "plannedMatchdays"));
  await db
    .update(seasons)
    .set({ name, startAt, plannedMatchdays })
    .where(eq(seasons.id, seasonId));
  revalidateLeague(seasonId);
}

export async function setSeasonStatus(seasonId: string, status: "active" | "ended") {
  await requireAdmin();
  await db.update(seasons).set({ status }).where(eq(seasons.id, seasonId));
  revalidateLeague(seasonId);
  // Crown the champion to everyone when the season closes.
  if (status === "ended") await notifyLeagueChampion(seasonId).catch(() => {});
}

const AWARD_FIELDS = ["topScorerId", "fairplayTeamId", "playerOfSeasonId", "bestGkId"] as const;
type AwardField = (typeof AWARD_FIELDS)[number];

// Set (or clear, when winnerId is blank) one award winner. Overrides the
// auto-computed top-scorer / fair-play; sets the admin-only player/GK picks.
export async function setAward(seasonId: string, formData: FormData) {
  await requireAdmin();
  const field = str(formData, "field") as AwardField;
  if (!AWARD_FIELDS.includes(field)) throw new Error("Unknown award.");
  const winnerId = opt(formData, "winnerId");
  await db
    .update(seasons)
    .set({ [field]: winnerId })
    .where(eq(seasons.id, seasonId));
  revalidateLeague(seasonId);
}
