import { db } from "@/db";
import { renderPoster } from "@/server/poster/respond";
import type { PosterData, PosterTeam } from "@/server/poster/poster";
import { formatFull } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "match";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Public share link — intentionally unauthenticated (see proxy.ts). The
  // session id is an unguessable UUID, so the poster is unlisted.
  const { id } = await params;
  const slot = await db.query.sessions.findFirst({
    where: (s, { eq }) => eq(s.id, id),
    with: {
      venue: true,
      sport: true,
      fixtures: {
        orderBy: (f, { asc }) => asc(f.orderIndex),
        with: {
          homeTeam: { with: { players: { orderBy: (p, { asc }) => asc(p.name) } } },
          awayTeam: { with: { players: { orderBy: (p, { asc }) => asc(p.name) } } },
        },
      },
    },
  });
  if (!slot) return new Response("Not found", { status: 404 });

  // Distinct teams across all fixtures, in first-seen order (a 3-team
  // round-robin repeats each team across pairings — we want each once).
  type TeamRow = NonNullable<(typeof slot.fixtures)[number]["homeTeam"]>;
  const byId = new Map<string, TeamRow>();
  for (const f of slot.fixtures) {
    for (const t of [f.homeTeam, f.awayTeam]) {
      if (t && !byId.has(t.id)) byId.set(t.id, t);
    }
  }
  const teamRows = [...byId.values()];
  if (teamRows.length === 0) {
    return new Response("Add teams to this slot before generating a picture.", { status: 400 });
  }

  const toPosterTeam = (t: TeamRow): PosterTeam => ({
    name: t.name,
    players: t.players.map((p) => p.name),
  });

  const competitive = slot.kind === "competitive";
  const url = new URL(req.url);
  const requested = url.searchParams.get("variant");
  const variant: PosterData["variant"] =
    requested === "vs" || requested === "squad" || requested === "full"
      ? requested
      : competitive
        ? "vs"
        : "full";

  const when = formatFull(slot.startAt);
  const venue = `${slot.venue.name}${slot.venue.city ? `, ${slot.venue.city}` : ""}`;
  const sport = slot.sport?.name ?? null;

  let data: PosterData;
  let name: string;

  if (variant === "squad") {
    const ours = teamRows.find((t) => t.kind !== "external") ?? teamRows[0];
    data = { variant: "squad", kindLabel: "Team sheet", teams: [toPosterTeam(ours)], venue, when, sport };
    name = `${slug(ours.name)}-squad.png`;
  } else if (variant === "vs") {
    data = {
      variant: "vs",
      kindLabel: competitive ? "Competitive" : "Match day",
      teams: teamRows.slice(0, 2).map((t) => ({ name: t.name, players: [] })),
      venue,
      when,
      sport,
    };
    name = `${teamRows.slice(0, 2).map((t) => slug(t.name)).join("-vs-")}.png`;
  } else {
    data = {
      variant: "full",
      kindLabel: "Match day",
      teams: teamRows.map(toPosterTeam),
      venue,
      when,
      sport,
    };
    name = `${teamRows.map((t) => slug(t.name)).join("-")}-lineups.png`;
  }

  const download = url.searchParams.get("download") === "1";
  return renderPoster(data, download ? name : undefined);
}
