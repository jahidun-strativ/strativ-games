import { eq } from "drizzle-orm";
import { db } from "@/db";
import { transfers } from "@/db/schema";
import { renderPoster } from "@/server/poster/respond";
import type { PosterData } from "@/server/poster/poster";
import { formatDate } from "@/lib/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "transfer";

// The shareable "done deal" card for one transfer/swap. Public share link
// (unguessable UUID; the route ends in /poster so proxy.ts lets it through).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await db.query.transfers.findFirst({
    where: eq(transfers.id, id),
    with: {
      player: { columns: { name: true }, with: { sport: { columns: { name: true } } } },
      counterpart: { columns: { name: true } },
      fromTeam: { columns: { name: true } },
      toTeam: { columns: { name: true } },
    },
  });
  if (!t) return new Response("Not found", { status: 404 });

  const from = t.fromTeam?.name ?? null;
  const to = t.toTeam?.name ?? null;
  const swap = t.kind === "swap" && t.counterpart;
  const moves = swap
    ? [
        { player: t.player?.name ?? "—", from, to },
        { player: t.counterpart!.name, from: to, to: from },
      ]
    : [{ player: t.player?.name ?? "—", from, to }];

  const data: PosterData = {
    variant: "transfer",
    headline: swap ? "Swap Deal" : "Transfer",
    moves,
    date: formatDate(t.createdAt),
    sport: t.player?.sport?.name ?? null,
  };

  const download = new URL(req.url).searchParams.get("download") === "1";
  const label = slug(t.player?.name ?? "transfer");
  return renderPoster(data, download ? `${label}-transfer.png` : undefined);
}
