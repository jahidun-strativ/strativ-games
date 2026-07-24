import { db } from "@/db";
import { renderPoster } from "@/server/poster/respond";
import type { PosterData, PosterFixture } from "@/server/poster/poster";
import { formatWeekday, formatDayNum, formatMonthAbbr, formatTime } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// How many upcoming slots we draw. Keeps a very full calendar from producing an
// absurdly tall canvas; anything past this is noted in the subtitle.
const MAX_SLOTS = 10;

export async function GET(req: Request) {
  // Public share link — intentionally unauthenticated (see proxy.ts). No id in
  // the path, so this always renders the *current* upcoming schedule.
  const now = new Date();
  const rows = await db.query.matches.findMany({
    where: (m, { and, gte, eq }) => and(gte(m.kickoffAt, now), eq(m.status, "scheduled")),
    orderBy: (m, { asc }) => [asc(m.kickoffAt), asc(m.orderIndex)],
    with: {
      venue: { columns: { name: true, city: true } },
      sport: { columns: { name: true } },
    },
  });

  // Group fixtures by their booked slot (a round-robin shares one session); a
  // legacy standalone match becomes its own group. Map preserves insert order,
  // and the query is already sorted by kickoff, so groups come out chronological.
  type Row = (typeof rows)[number];
  const groups = new Map<string, Row[]>();
  for (const m of rows) {
    const key = m.sessionId ?? `m:${m.id}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(m);
    else groups.set(key, [m]);
  }

  const allSlots = [...groups.values()];
  const slots = allSlots.slice(0, MAX_SLOTS);

  const toFixture = (games: Row[]): PosterFixture => {
    const first = games[0];
    const venue = `${first.venue.name}${first.venue.city ? `, ${first.venue.city}` : ""}`;
    return {
      weekday: formatWeekday(first.kickoffAt),
      day: formatDayNum(first.kickoffAt),
      month: formatMonthAbbr(first.kickoffAt),
      time: formatTime(first.kickoffAt),
      venue,
    };
  };

  const fixtures = slots.map(toFixture);
  const sport = rows.find((m) => m.sport?.name)?.sport?.name ?? null;

  const slotCount = groups.size;
  const gameCount = rows.length;
  const parts = [
    `${slotCount} session${slotCount === 1 ? "" : "s"}`,
    `${gameCount} game${gameCount === 1 ? "" : "s"}`,
  ];
  if (allSlots.length > slots.length) parts.push(`showing first ${slots.length}`);
  const subtitle = gameCount > 0 ? parts.join("  ·  ") : null;

  const data: PosterData = {
    variant: "fixtures",
    kindLabel: "Upcoming",
    subtitle,
    fixtures,
    sport,
  };

  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";
  return renderPoster(data, download ? "strativ-upcoming-fixtures.png" : undefined);
}
