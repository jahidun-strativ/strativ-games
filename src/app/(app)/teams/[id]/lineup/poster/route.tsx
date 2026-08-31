import { db } from "@/db";
import { renderPoster } from "@/server/poster/respond";
import type { PosterData } from "@/server/poster/poster";
import {
  ALL_FORMATIONS,
  DEFAULT_FORMATION,
  buildFormationSlots,
  squadSizeOf,
} from "@/lib/formations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "team";

// A team's line-up drawn on the pitch as a branded PNG. Public share link
// (unguessable UUID; see proxy.ts), like the other posters.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await db.query.teams.findFirst({
    where: (t, { eq }) => eq(t.id, id),
    with: {
      sport: { columns: { name: true } },
      players: { columns: { id: true, name: true } },
      lineup: { with: { slots: true } },
    },
  });
  if (!team) return new Response("Not found", { status: 404 });
  if (team.kind === "external") {
    return new Response("External opponents have no line-up.", { status: 400 });
  }

  const formation =
    team.lineup?.formation && ALL_FORMATIONS.includes(team.lineup.formation)
      ? team.lineup.formation
      : DEFAULT_FORMATION;

  const nameById = new Map(team.players.map((p) => [p.id, p.name] as const));
  const starters: Record<number, string | null> = {};
  const subs: Record<number, string | null> = {};
  for (const s of team.lineup?.slots ?? []) {
    if (s.role === "starter") starters[s.slotIndex] = s.playerId;
    else subs[s.slotIndex] = s.playerId;
  }
  const nameOf = (pid: string | null | undefined) => (pid ? nameById.get(pid) ?? null : null);

  const data: PosterData = {
    variant: "lineup",
    teamName: team.name,
    formation,
    squadLabel: `${squadSizeOf(formation)}-a-side`,
    slots: buildFormationSlots(formation).map((fs, i) => ({
      position: fs.position,
      x: fs.x,
      y: fs.y,
      name: nameOf(starters[i]),
      sub: nameOf(subs[i]),
    })),
    sport: team.sport?.name ?? null,
  };

  const download = new URL(req.url).searchParams.get("download") === "1";
  return renderPoster(data, download ? `${slug(team.name)}-lineup.png` : undefined);
}
