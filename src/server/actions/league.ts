"use server";

import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { matches, seasons, sessions, teams } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
import { int, opt, optInt, str } from "@/server/form";
import { threeTeamRoundRobin } from "@/server/round-robin";
import { seedDefaultAvailability } from "@/server/seed-availability";
import { notifyLeagueMatchday, notifyLeagueChampion } from "@/server/notify-match";
import { getNotificationSettings } from "@/server/queries/notification-settings";

function revalidateLeague(seasonId?: string) {
  revalidatePath("/league");
  revalidatePath("/league/matches");
  revalidatePath("/matches");
  revalidatePath("/costs");
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
  const cost = optInt(formData, "cost");
  const paidBy = opt(formData, "paidBy") === "self" ? "self" : "office";

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
  // Rotate the rest roles by matchday number so no team is permanently favoured.
  const planned = threeTeamRoundRobin(leagueTeams.map((t) => t.id), existing);

  const [session] = await db
    .insert(sessions)
    .values({
      seasonId,
      sportId: season.sportId,
      venueId,
      kind: "internal",
      title: `Matchday ${existing + 1}`,
      startAt,
      cost,
      paidBy,
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

// Edit a matchday: its title, venue, start slot and the per-game pairings.
// Rescheduling shifts each still-to-play game by the same delta so the round-
// robin timing stays intact; completed/cancelled games keep their recorded slot
// and locked pairing. A reassigned game reseeds availability for its new teams.
export async function updateMatchday(sessionId: string, formData: FormData) {
  await requireAdmin();
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { fixtures: true },
  });
  if (!session?.seasonId) throw new Error("Matchday not found.");

  const title = opt(formData, "title");
  const venueId = str(formData, "venueId");
  const startAt = new Date(str(formData, "startAt"));
  if (Number.isNaN(startAt.getTime())) throw new Error("Invalid start time.");
  const cost = optInt(formData, "cost");
  const paidBy = opt(formData, "paidBy") === "self" ? "self" : "office";
  const delta = startAt.getTime() - session.startAt.getTime();

  await db
    .update(sessions)
    .set({ title: title ?? session.title, venueId, startAt, cost, paidBy })
    .where(eq(sessions.id, sessionId));

  for (const f of session.fixtures) {
    if (f.status !== "scheduled") continue; // don't touch played/cancelled games
    const home = opt(formData, `home_${f.id}`);
    const away = opt(formData, `away_${f.id}`);
    if (home && away && home === away) {
      throw new Error("A game can't have the same team on both sides.");
    }
    await db
      .update(matches)
      .set({
        venueId,
        kickoffAt: new Date(f.kickoffAt.getTime() + delta),
        ...(home && away ? { homeTeamId: home, awayTeamId: away } : {}),
      })
      .where(eq(matches.id, f.id));
    if (home && away) await seedDefaultAvailability(f.id, [home, away]);
  }

  revalidateLeague(session.seasonId);
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
