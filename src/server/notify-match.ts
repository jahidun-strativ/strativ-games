import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { sendPushToAll, sendPushToEndpoint, type PushPayload } from "@/lib/push";
import { formatFull } from "@/lib/format";

type Variant = "created" | "updated" | "rescheduled" | "cancelled" | "day" | "hour";

const TITLES: Record<Variant, string> = {
  created: "⚽ New match scheduled",
  updated: "✏️ Match updated",
  rescheduled: "📅 Match rescheduled",
  cancelled: "❌ Match cancelled",
  day: "📅 Match tomorrow",
  hour: "⏰ Match starting soon",
};

export async function buildMatchPayload(
  matchId: string,
  variant: Variant,
): Promise<PushPayload | null> {
  const m = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    with: { venue: true, homeTeam: true, awayTeam: true },
  });
  if (!m) return null;
  const label =
    m.homeTeam && m.awayTeam
      ? `${m.homeTeam.name} vs ${m.awayTeam.name}`
      : m.title || "Match";
  return {
    title: TITLES[variant],
    body: `${label} · ${formatFull(m.kickoffAt)} at ${m.venue.name}`,
    url: `/matches/${m.id}`,
  };
}

// Push a match notification to every subscribed device.
export async function notifyMatchToAll(matchId: string, variant: Variant) {
  const payload = await buildMatchPayload(matchId, variant);
  if (payload) await sendPushToAll(payload);
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
