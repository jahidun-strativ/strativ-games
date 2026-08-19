import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, sessions } from "@/db/schema";
import { sendPushToAll, sendPushToEndpoint, type PushPayload } from "@/lib/push";
import { notifyAllUsers } from "@/server/notifications";
import { getSeasonById, getSeasonView } from "@/server/queries/season";
import { formatFull } from "@/lib/format";

type Variant =
  | "created"
  | "updated"
  | "rescheduled"
  | "cancelled"
  | "announce"
  | "day"
  | "hour"
  | "today";

const TITLES: Record<Variant, string> = {
  created: "⚽ New match scheduled",
  updated: "✏️ Match updated",
  rescheduled: "📅 Match rescheduled",
  cancelled: "❌ Match cancelled",
  announce: "📢 Match reminder",
  day: "📅 Match tomorrow",
  hour: "⏰ Match starting soon",
  today: "⚽ Match today",
};

export async function buildMatchPayload(
  matchId: string,
  variant: Variant,
): Promise<PushPayload | null> {
  const m = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: {
      venue: true,
      homeTeam: true,
      awayTeam: true,
      session: { columns: { title: true }, with: { season: { columns: { id: true, name: true } } } },
    },
  });
  if (!m) return null;
  const label =
    m.homeTeam && m.awayTeam
      ? `${m.homeTeam.name} vs ${m.awayTeam.name}`
      : m.title || "Match";
  // League matchdays get their own branding and deep-link to the league page.
  const league = m.session?.season ?? null;
  if (league) {
    return {
      title: TITLES[variant],
      body: `${league.name} · ${m.session?.title ?? "Matchday"} — ${label} · ${formatFull(m.kickoffAt)}`,
      url: `/league/${league.id}`,
    };
  }
  return {
    title: TITLES[variant],
    body: `${label} · ${formatFull(m.kickoffAt)} at ${m.venue.name}`,
    url: `/matches/${m.id}`,
  };
}

// Push a match notification to every subscribed device, and drop it in every
// user's in-app inbox so there's a history even without push enabled.
export async function notifyMatchToAll(matchId: string, variant: Variant) {
  const payload = await buildMatchPayload(matchId, variant);
  if (!payload) return;
  await sendPushToAll(payload);
  await notifyAllUsers({ type: "match", title: payload.title, body: payload.body, url: payload.url });
}

// Full-time: tell everyone the final score and deep-link to the PUBLIC result
// page (openable without signing in).
export async function notifyMatchResult(matchId: string) {
  const m = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: {
      homeTeam: true,
      awayTeam: true,
      session: { columns: { title: true }, with: { season: { columns: { id: true, name: true } } } },
    },
  });
  if (!m || !m.homeTeam || !m.awayTeam) return;
  const score = `${m.homeScore ?? 0}–${m.awayScore ?? 0}`;
  const league = m.session?.season ?? null;
  if (league) {
    const title = "🏁 League full-time";
    const body = `${m.homeTeam.name} ${score} ${m.awayTeam.name} · ${league.name}${m.session?.title ? ` · ${m.session.title}` : ""}`;
    const url = `/result/${m.id}`;
    await sendPushToAll({ title, body, url });
    await notifyAllUsers({ type: "league", title, body, url });
    return;
  }
  const title = "🏁 Full-time";
  const body = `${m.homeTeam.name} ${score} ${m.awayTeam.name} · tap for the result`;
  const url = `/result/${m.id}`;
  await sendPushToAll({ title, body, url });
  await notifyAllUsers({ type: "result", title, body, url });
}

// A whole league matchday was scheduled (one slot, 3 round-robin games) — one
// push/inbox item to everyone, deep-linking to the league page.
export async function notifyLeagueMatchday(sessionId: string) {
  const s = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: {
      venue: true,
      season: { columns: { id: true, name: true } },
      fixtures: { with: { homeTeam: { columns: { name: true } }, awayTeam: { columns: { name: true } } } },
    },
  });
  if (!s || !s.season) return;
  const teamNames = [
    ...new Set(s.fixtures.flatMap((f) => [f.homeTeam?.name, f.awayTeam?.name]).filter(Boolean)),
  ];
  const title = `🏆 ${s.season.name}`;
  const body = `${s.title} scheduled — ${teamNames.join(", ")} · ${formatFull(s.startAt)} at ${s.venue.name}`;
  const url = `/league/${s.season.id}`;
  await sendPushToAll({ title, body, url });
  await notifyAllUsers({ type: "league", title, body, url });
}

// Season ended — crown the champion (and name the top scorer) to everyone.
export async function notifyLeagueChampion(seasonId: string) {
  const season = await getSeasonById(seasonId);
  if (!season) return;
  const view = await getSeasonView(season);
  const parts: string[] = [];
  if (view.champion) parts.push(`Champions: ${view.champion.teamName}`);
  if (view.awards.topScorer)
    parts.push(`Top scorer: ${view.awards.topScorer.player.name} (${view.awards.topScorer.goals})`);
  const title = `🏆 ${season.name} — Champions`;
  const body = parts.length ? parts.join(" · ") : "The season has ended — see the final standings.";
  const url = `/league/${season.id}`;
  await sendPushToAll({ title, body, url });
  await notifyAllUsers({ type: "league", title, body, url });
}

// One push for a booked slot (single game or round-robin), linking to the
// session page rather than pinging once per fixture.
export async function notifySessionCreated(sessionId: string) {
  const s = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { venue: true, fixtures: { with: { homeTeam: true, awayTeam: true } } },
  });
  if (!s) return;
  const games = s.fixtures.length;
  const when = `${formatFull(s.startAt)} at ${s.venue.name}`;

  let body: string;
  if (games <= 1) {
    const f = s.fixtures[0];
    const label =
      f?.homeTeam && f?.awayTeam ? `${f.homeTeam.name} vs ${f.awayTeam.name}` : s.title || "Match";
    body = `${label} · ${when}`;
  } else {
    const teamNames = [
      ...new Set(
        s.fixtures.flatMap((f) => [f.homeTeam?.name, f.awayTeam?.name]).filter(Boolean),
      ),
    ];
    body = `${teamNames.join(", ")} · ${when}`;
  }

  const title = games > 1 ? "⚽ New round-robin scheduled" : "⚽ New match scheduled";
  const url = `/sessions/${sessionId}`;
  await sendPushToAll({ title, body, url });
  await notifyAllUsers({ type: "match", title, body, url });
}

// Catch-up: push upcoming scheduled matches to a single newly-subscribed device.
export async function notifyUpcomingToEndpoint(endpoint: string) {
  const now = new Date();
  const upcoming = await db.query.matches.findMany({
    where: (mm, { and, eq: e, gte }) => and(e(mm.status, "scheduled"), gte(mm.kickoffAt, now)),
    orderBy: (mm, { asc }) => asc(mm.kickoffAt),
    with: { venue: true, homeTeam: true, awayTeam: true },
    limit: 3,
  });
  for (const m of upcoming) {
    const label =
      m.homeTeam && m.awayTeam
        ? `${m.homeTeam.name} vs ${m.awayTeam.name}`
        : m.title || "Match";
    await sendPushToEndpoint(endpoint, {
      title: "📢 Upcoming Strativ match",
      body: `${label} · ${formatFull(m.kickoffAt)} at ${m.venue.name}`,
      url: `/matches/${m.id}`,
    });
  }
}
