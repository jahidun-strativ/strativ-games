import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { matchEvents } from "@/db/schema";

export type TimelineEvent = {
  id: string;
  kind: string;
  minute: number | null;
  teamId: string | null;
  playerName: string;
  assistName: string | null;
  createdAt: Date;
};

// The live timeline for a match, oldest first, with names resolved for display.
export async function getMatchEvents(matchId: string): Promise<TimelineEvent[]> {
  const rows = await db.query.matchEvents.findMany({
    where: eq(matchEvents.matchId, matchId),
    orderBy: [asc(matchEvents.createdAt)],
    with: {
      player: { columns: { name: true } },
      assist: { columns: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    minute: r.minute,
    teamId: r.teamId,
    playerName: r.player.name,
    assistName: r.assist?.name ?? null,
    createdAt: r.createdAt,
  }));
}
