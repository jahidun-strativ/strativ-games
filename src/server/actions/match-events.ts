"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { matchEvents, matches, playerMatchStats } from "@/db/schema";
import { requireAdmin, requireMatchScorer } from "@/server/auth";
import { opt, optInt, str } from "@/server/form";
import { deriveScore, tallyEvents } from "@/lib/match-scoring";
import { notifyMatchResult } from "@/server/notify-match";
import { notifyUsers } from "@/server/notifications";
import { recordAudit } from "@/server/audit";

// Refresh every surface a live event touches: the manager, the public result
// page with its timeline, and the league/stats views that read the score.
function revalidateLive(id: string) {
  revalidatePath(`/league/matches/${id}`);
  revalidatePath(`/matches/${id}`);
  revalidatePath(`/result/${id}`);
  revalidatePath("/matches");
  revalidatePath("/league");
  revalidatePath("/");
}

// Live score = goals logged for each side. Kept in matches.homeScore/awayScore
// so the scoreboard everywhere reflects the timeline without a separate query.
async function syncScore(matchId: string) {
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { homeTeamId: true, awayTeamId: true },
  });
  const events = await db.query.matchEvents.findMany({
    where: eq(matchEvents.matchId, matchId),
    columns: { kind: true, teamId: true, playerId: true, assistPlayerId: true },
  });
  const { homeScore, awayScore } = deriveScore(
    events,
    match?.homeTeamId ?? null,
    match?.awayTeamId ?? null,
  );
  await db.update(matches).set({ homeScore, awayScore }).where(eq(matches.id, matchId));
}

// Admin assigns (or clears, with an empty value) the person who runs this
// match's live scorecard. That user then passes requireMatchScorer.
export async function assignScorer(matchId: string, formData: FormData) {
  await requireAdmin();
  const scorerUserId = opt(formData, "scorerUserId");
  await db.update(matches).set({ scorerUserId }).where(eq(matches.id, matchId));
  await recordAudit({
    action: "match.scorer.assign",
    entity: "match",
    entityId: matchId,
    summary: scorerUserId ? "Assigned a match scorekeeper" : "Cleared the match scorekeeper",
  });
  if (scorerUserId) {
    await notifyUsers([scorerUserId], {
      type: "assignment",
      title: "🎙️ You're on the scorecard",
      body: "You've been assigned to run a match's live scorecard — tap to open it.",
      url: `/league/matches/${matchId}`,
    }).catch(() => {});
  }
  revalidateLive(matchId);
}

// Log one live event (a goal with optional assist, or a keeper save) and
// re-derive the score. Scorer/captain/admin only.
export async function addMatchEvent(matchId: string, formData: FormData) {
  await requireMatchScorer(matchId);
  const kind = str(formData, "kind");
  if (kind !== "goal" && kind !== "save") throw new Error("Unknown event kind.");
  const playerId = str(formData, "playerId");
  const teamId = opt(formData, "teamId");
  const assistPlayerId = kind === "goal" ? opt(formData, "assistPlayerId") : null;
  const minute = optInt(formData, "minute");
  if (assistPlayerId && assistPlayerId === playerId) {
    throw new Error("A scorer can't assist their own goal.");
  }

  await db.insert(matchEvents).values({ matchId, kind, teamId, playerId, assistPlayerId, minute });
  await syncScore(matchId);
  revalidateLive(matchId);
}

export async function deleteMatchEvent(matchId: string, eventId: string) {
  await requireMatchScorer(matchId);
  await db
    .delete(matchEvents)
    .where(and(eq(matchEvents.id, eventId), eq(matchEvents.matchId, matchId)));
  await syncScore(matchId);
  revalidateLive(matchId);
}

// End the match: roll the timeline up into per-player aggregates (the season
// stats pipeline reads only these + completed matches), mark it completed, and
// fire the full-time push. Idempotent aggregation — safe to re-finalize.
export async function finalizeMatch(matchId: string) {
  await requireMatchScorer(matchId);
  const events = await db.query.matchEvents.findMany({
    where: eq(matchEvents.matchId, matchId),
  });
  const tally = tallyEvents(events);

  await syncScore(matchId);

  const prev = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
    columns: { status: true },
  });
  const firstCompletion = prev?.status !== "completed";
  await db.update(matches).set({ status: "completed" }).where(eq(matches.id, matchId));

  // Rebuild this match's stats from the timeline — delete-then-insert keeps
  // finalize idempotent (a removed event leaves no phantom row on re-finalize).
  // Anyone on the timeline played.
  await db.delete(playerMatchStats).where(eq(playerMatchStats.matchId, matchId));
  const rows = tally.map((t) => ({ matchId, ...t }));
  if (rows.length > 0) await db.insert(playerMatchStats).values(rows);

  await recordAudit({
    action: "match.finalize",
    entity: "match",
    entityId: matchId,
    summary: `Finalized a live match (${events.length} events)`,
  });

  revalidateLive(matchId);
  revalidatePath("/stats");
  revalidatePath("/players");
  if (firstCompletion) {
    try {
      await notifyMatchResult(matchId);
    } catch {
      // ignore — result is already saved
    }
  }
}
