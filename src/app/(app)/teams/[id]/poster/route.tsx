import { db } from "@/db";
import { renderPoster } from "@/server/poster/respond";
import type { PosterData } from "@/server/poster/poster";
import { getActiveSeason } from "@/server/queries/season";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "team";

// A team's squad sheet: the team name + its full player list, as a branded PNG.
// Public share link (unguessable UUID; see proxy.ts), like the match posters.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const team = await db.query.teams.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      sport: { columns: { name: true } },
      players: {
        columns: { id: true, name: true, position: true },
        orderBy: (p, { asc }) => asc(p.name),
      },
    },
  });
  if (!team) return new Response("Not found", { status: 404 });
  if (team.kind === "external") {
    return new Response("External opponents have no roster to picture.", { status: 400 });
  }

  // A team in the active season's sport gets the gold league ribbon so its squad
  // sheet is branded as part of the league; other teams get the plain header.
  const season = await getActiveSeason();
  const league =
    season && season.sportId === team.sportId
      ? { seasonName: season.name, matchday: "", label: "Team Squad" }
      : null;

  const data: PosterData = {
    variant: "squad",
    kindLabel: "Squad",
    teams: [{ name: team.name, players: team.players.map((p) => p.name) }],
    roster: team.players.map((p) => ({
      name: p.name,
      position: p.position,
      captain: p.id === team.captainId,
    })),
    sport: team.sport?.name ?? null,
    league,
  };

  const download = new URL(req.url).searchParams.get("download") === "1";
  return renderPoster(data, download ? `${slug(team.name)}-squad.png` : undefined);
}
