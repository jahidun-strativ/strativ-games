import { db } from "@/db";
import { isAdmin } from "@/server/auth";
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
  // Admin-only (route handlers don't inherit the (app) layout auth).
  if (!(await isAdmin())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const match = await db.query.matches.findFirst({
    where: (m, { eq }) => eq(m.id, id),
    with: {
      homeTeam: { with: { players: { orderBy: (p, { asc }) => asc(p.name) } } },
      awayTeam: { with: { players: { orderBy: (p, { asc }) => asc(p.name) } } },
      venue: true,
      sport: true,
    },
  });
  if (!match) return new Response("Not found", { status: 404 });

  const home = match.homeTeam;
  const away = match.awayTeam;
  if (!home || !away) {
    return new Response("Assign both teams before generating a picture.", { status: 400 });
  }

  const toPosterTeam = (t: NonNullable<typeof home>): PosterTeam => ({
    name: t.name,
    players: t.players.map((p) => p.name),
  });

  const competitive = match.kind === "competitive";
  const url = new URL(req.url);
  const requested = url.searchParams.get("variant");
  // Default: a VS poster for competitive games, a full line-up for internal.
  const variant: PosterData["variant"] =
    requested === "vs" || requested === "squad" || requested === "full"
      ? requested
      : competitive
        ? "vs"
        : "full";

  const when = formatFull(match.kickoffAt);
  const venue = `${match.venue.name}${match.venue.city ? `, ${match.venue.city}` : ""}`;
  const sport = match.sport?.name ?? null;

  let data: PosterData;
  let name: string;

  if (variant === "squad") {
    // The Strativ (internal) side's roster on its own.
    const ours = home.kind !== "external" ? home : away;
    data = {
      variant: "squad",
      kindLabel: "Team sheet",
      teams: [toPosterTeam(ours)],
      venue,
      when,
      sport,
    };
    name = `${slug(ours.name)}-squad.png`;
  } else if (variant === "vs") {
    data = {
      variant: "vs",
      kindLabel: competitive ? "Competitive" : "Match day",
      teams: [{ name: home.name, players: [] }, { name: away.name, players: [] }],
      venue,
      when,
      sport,
    };
    name = `${slug(home.name)}-vs-${slug(away.name)}.png`;
  } else {
    data = {
      variant: "full",
      kindLabel: "Match day",
      teams: [toPosterTeam(home), toPosterTeam(away)],
      venue,
      when,
      sport,
    };
    name = `${slug(home.name)}-vs-${slug(away.name)}-lineups.png`;
  }

  const download = url.searchParams.get("download") === "1";
  return renderPoster(data, download ? name : undefined);
}
