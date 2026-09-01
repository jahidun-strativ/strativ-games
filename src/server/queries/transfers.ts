import { desc } from "drizzle-orm";
import { db } from "@/db";
import { transfers } from "@/db/schema";

// One transfer/swap resolved to display names, plus the reconstructed moves.
export type TransferView = {
  id: string;
  kind: string; // "transfer" | "swap"
  createdAt: Date;
  sportId: string | null;
  // 1 move for a transfer, 2 for a swap. from = null means free agent.
  moves: { player: string; from: string | null; to: string | null }[];
};

// Recent roster moves, newest first, resolved to names. Optionally scoped to a
// sport (the player's sport) so the league page shows only its own transfers.
export async function getRecentTransfers(
  opts: { sportId?: string; limit?: number } = {},
): Promise<TransferView[]> {
  const rows = await db.query.transfers.findMany({
    orderBy: [desc(transfers.createdAt)],
    limit: opts.limit ?? 60,
    with: {
      player: { columns: { name: true, sportId: true } },
      counterpart: { columns: { name: true } },
      fromTeam: { columns: { name: true } },
      toTeam: { columns: { name: true } },
    },
  });

  return rows
    .filter((r) => !opts.sportId || r.player?.sportId === opts.sportId)
    .map((r) => {
      const from = r.fromTeam?.name ?? null;
      const to = r.toTeam?.name ?? null;
      const moves =
        r.kind === "swap" && r.counterpart
          ? [
              { player: r.player?.name ?? "—", from, to },
              // The counterpart's move is the reverse of the primary player's.
              { player: r.counterpart.name, from: to, to: from },
            ]
          : [{ player: r.player?.name ?? "—", from, to }];
      return {
        id: r.id,
        kind: r.kind,
        createdAt: r.createdAt,
        sportId: r.player?.sportId ?? null,
        moves,
      };
    });
}
