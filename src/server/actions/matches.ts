"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { appUsers, matches, playerMatchStats, pushSubscriptions, sessions, teams } from "@/db/schema";
import { requireAdmin, requireMatchScorer } from "@/server/auth";
import { recordAudit } from "@/server/audit";
import { opt, optInt, str } from "@/server/form";
import { notifyMatchToAll, notifyMatchResult } from "@/server/notify-match";
import { notifyPlayers } from "@/server/notifications";
import { seedDefaultAvailability } from "@/server/seed-availability";
import { pushConfigured } from "@/lib/push";
import { getNotificationSettings } from "@/server/queries/notification-settings";

// `sent` = push devices reached; `inApp` = app users who got an in-app row.
export type NotifyResult = { sent: number; inApp: number; configured: boolean };

// "Home v Away" for readable audit summaries; falls back to the id.
async function matchLabel(id: string): Promise<string> {
  const m = await db.query.matches.findFirst({
    where: eq(matches.id, id),
    with: { homeTeam: { columns: { name: true } }, awayTeam: { columns: { name: true } } },
  });
  if (!m) return id;
  return `${m.homeTeam?.name ?? "TBD"} v ${m.awayTeam?.name ?? "TBD"}`;
}

// Manually (re)send a match's notification to everyone — ignores the toggle.
// Fires both the PWA push (subscribed devices) and the in-app inbox (all users).
export async function resendMatchNotification(id: string): Promise<NotifyResult> {
  await requireAdmin();
  const [sent, inApp] = await Promise.all([
    db.$count(pushSubscriptions),
    db.$count(appUsers),
  ]);
  await notifyMatchToAll(id, "announce");
  return { sent, inApp, configured: pushConfigured };
}

function revalidateMatchPages(id?: string) {
  revalidatePath("/matches");
  revalidatePath("/stats");
  revalidatePath("/league");
  revalidatePath("/");
  if (id) revalidatePath(`/matches/${id}`);
}

// Venue + kickoff are the only required fields — sport/teams are optional and
// can be assigned later. When teams are given, they must share one sport.
async function parseMatchInput(formData: FormData) {
  const venueId = str(formData, "venueId");
  const kickoffAt = new Date(str(formData, "kickoffAt"));
  if (Number.isNaN(kickoffAt.getTime())) throw new Error("Invalid kickoff time.");

  const homeTeamId = opt(formData, "homeTeamId");
  const awayTeamId = opt(formData, "awayTeamId");
  let sportId = opt(formData, "sportId");
  const title = opt(formData, "title");
  const notes = opt(formData, "notes");
  const kind = opt(formData, "kind") === "competitive" ? "competitive" : "internal";
  const cost = optInt(formData, "cost");
  const paidBy = opt(formData, "paidBy") === "self" ? "self" : "office";

  if (homeTeamId && awayTeamId && homeTeamId === awayTeamId) {
    throw new Error("Home and away team must differ.");
  }

  const teamIds = [homeTeamId, awayTeamId].filter(Boolean) as string[];
  if (teamIds.length > 0) {
    const rows = await db.select().from(teams).where(inArray(teams.id, teamIds));
    const teamSports = new Set(rows.map((t) => t.sportId));
    if (teamSports.size > 1) throw new Error("Both teams must be in the same sport.");
    const teamSport = rows[0]?.sportId ?? null;
    if (teamSport) {
      if (sportId && sportId !== teamSport) {
        throw new Error("Selected teams don't belong to the chosen sport.");
      }
      sportId = teamSport;
    }
  }

  return {
    kind,
    sportId: sportId ?? null,
    homeTeamId: homeTeamId ?? null,
    awayTeamId: awayTeamId ?? null,
    title,
    venueId,
    kickoffAt,
    cost,
    paidBy,
    notes,
  };
}

async function assertVenueFree(venueId: string, kickoffAt: Date, excludeMatchId?: string) {
  const clash = await db.query.matches.findFirst({
    where: excludeMatchId
      ? and(
          eq(matches.venueId, venueId),
          eq(matches.kickoffAt, kickoffAt),
          ne(matches.id, excludeMatchId),
          ne(matches.status, "cancelled"),
        )
      : and(
          eq(matches.venueId, venueId),
          eq(matches.kickoffAt, kickoffAt),
          ne(matches.status, "cancelled"),
        ),
  });
  if (clash) throw new Error("Venue is already booked at that kickoff time.");
}

export async function createMatch(formData: FormData) {
  await requireAdmin();
  const values = await parseMatchInput(formData);
  await assertVenueFree(values.venueId, values.kickoffAt);
  const [match] = await db.insert(matches).values(values).returning();
  await seedDefaultAvailability(match.id, [values.homeTeamId, values.awayTeamId]);
  await recordAudit({
    action: "match.create",
    entity: "match",
    entityId: match.id,
    summary: `Scheduled ${await matchLabel(match.id)}`,
  });
  revalidateMatchPages();
  // Notify all subscribers (admins included) if on-create notifications are on.
  const settings = await getNotificationSettings();
  if (settings.notifyOnCreate) {
    await notifyMatchToAll(match.id, "created").catch(() => {});
  }
}

// Notify subscribers of a change, gated by the same toggle as new matches.
async function notifyMatchChange(id: string, variant: "updated" | "rescheduled" | "cancelled") {
  const settings = await getNotificationSettings();
  if (settings.notifyOnCreate) await notifyMatchToAll(id, variant).catch(() => {});
}

// Assign/change sport, teams, title, venue or kickoff after creation.
export async function updateMatch(id: string, formData: FormData) {
  await requireAdmin();
  const values = await parseMatchInput(formData);
  await assertVenueFree(values.venueId, values.kickoffAt, id);
  // Only the "when/where" matters for a push — skip notifying on edits that
  // just assign teams, retitle, etc. so people aren't pinged for noise.
  const before = await db.query.matches.findFirst({
    where: eq(matches.id, id),
    columns: { venueId: true, kickoffAt: true },
  });
  const whenWhereChanged =
    !before ||
    before.venueId !== values.venueId ||
    before.kickoffAt.getTime() !== values.kickoffAt.getTime();
  await db.update(matches).set(values).where(eq(matches.id, id));
  // Opt-out RSVP: (newly) assigned teams' players default to "in". Existing
  // explicit responses are never overwritten (insert is do-nothing on conflict).
  await seedDefaultAvailability(id, [values.homeTeamId, values.awayTeamId]);
  revalidateMatchPages(id);
  if (whenWhereChanged) await notifyMatchChange(id, "rescheduled");
}

export async function rescheduleMatch(id: string, formData: FormData) {
  await requireAdmin();
  const venueId = str(formData, "venueId");
  const kickoffAt = new Date(str(formData, "kickoffAt"));
  if (Number.isNaN(kickoffAt.getTime())) throw new Error("Invalid kickoff time.");
  await assertVenueFree(venueId, kickoffAt, id);
  await db
    .update(matches)
    .set({ venueId, kickoffAt, status: "scheduled" })
    .where(eq(matches.id, id));
  await recordAudit({
    action: "match.reschedule",
    entity: "match",
    entityId: id,
    summary: `Rescheduled ${await matchLabel(id)}`,
  });
  revalidateMatchPages(id);
  await notifyMatchChange(id, "rescheduled");
}

export async function cancelMatch(id: string) {
  await requireAdmin();
  const label = await matchLabel(id);
  await db.update(matches).set({ status: "cancelled" }).where(eq(matches.id, id));
  await recordAudit({ action: "match.cancel", entity: "match", entityId: id, summary: `Cancelled ${label}` });
  revalidateMatchPages(id);
  await notifyMatchChange(id, "cancelled");
}

export async function deleteMatch(id: string) {
  await requireAdmin();
  const label = await matchLabel(id);
  await db.delete(matches).where(eq(matches.id, id));
  await recordAudit({ action: "match.delete", entity: "match", entityId: id, summary: `Deleted ${label}` });
  revalidateMatchPages();
  redirect("/matches");
}

// Quietly put a completed match back to "scheduled" so its data can be fixed —
// sends no push (unlike reschedule). Optionally wipes the recorded score +
// player stats for a clean do-over; otherwise they stay prefilled in the form.
// Re-completing afterwards fires the full-time push again (scheduled→completed
// transition) — deliberate: a corrected final is worth announcing.
export async function reopenMatch(id: string, clearResult: boolean) {
  await requireAdmin();
  const match = await db.query.matches.findFirst({
    where: eq(matches.id, id),
    columns: { status: true, sessionId: true },
  });
  if (!match) throw new Error("Match not found.");
  if (match.status !== "completed") throw new Error("Only a completed match can be reopened.");

  await db
    .update(matches)
    .set(
      clearResult
        ? { status: "scheduled", homeScore: null, awayScore: null }
        : { status: "scheduled" },
    )
    .where(eq(matches.id, id));
  if (clearResult) {
    await db.delete(playerMatchStats).where(eq(playerMatchStats.matchId, id));
  }

  revalidateMatchPages(id);
  revalidatePath("/players");
  revalidatePath(`/result/${id}`);
  // Clearing the result changes who "played" — refresh the derived cost split.
  if (clearResult) {
    revalidatePath("/costs");
    if (match.sessionId) revalidatePath(`/sessions/${match.sessionId}`);
  }
}

export async function recordResult(id: string, formData: FormData) {
  await requireMatchScorer(id);
  const homeScore = optInt(formData, "homeScore") ?? 0;
  const awayScore = optInt(formData, "awayScore") ?? 0;

  // Notify everyone only on the first time a match is completed — editing an
  // already-final result later shouldn't re-ping.
  const prev = await db.query.matches.findFirst({
    where: eq(matches.id, id),
    columns: { status: true, sessionId: true },
  });
  const firstCompletion = prev?.status !== "completed";

  await db
    .update(matches)
    .set({ homeScore, awayScore, status: "completed" })
    .where(eq(matches.id, id));

  await recordAudit({
    action: "match.result",
    entity: "match",
    entityId: id,
    summary: `Recorded ${await matchLabel(id)} — ${homeScore}–${awayScore}`,
  });

  // Per-player rows: stat-<playerId>-goals / -assists / -fouls / -gk / -played.
  const statements = [];
  const playerIds = new Set<string>();
  const playedIds: string[] = [];
  for (const key of formData.keys()) {
    const m = key.match(/^stat-(.+)-(goals|assists|fouls|gk|saves|played)$/);
    if (m) playerIds.add(m[1]);
  }
  for (const playerId of playerIds) {
    const goals = optInt(formData, `stat-${playerId}-goals`) ?? 0;
    const assists = optInt(formData, `stat-${playerId}-assists`) ?? 0;
    const fouls = optInt(formData, `stat-${playerId}-fouls`) ?? 0;
    const goalkeeper = formData.get(`stat-${playerId}-gk`) === "on";
    // Saves belong to keepers only — ignore any value on an outfield player.
    const saves = goalkeeper ? optInt(formData, `stat-${playerId}-saves`) ?? 0 : 0;
    // A keeper is on the pitch — count them as played even if the box is unticked.
    const played = formData.get(`stat-${playerId}-played`) === "on" || goalkeeper;
    if (played) playedIds.push(playerId);
    if (!played && goals === 0 && assists === 0 && fouls === 0 && saves === 0) {
      statements.push(
        db
          .delete(playerMatchStats)
          .where(
            and(eq(playerMatchStats.matchId, id), eq(playerMatchStats.playerId, playerId)),
          ),
      );
      continue;
    }
    statements.push(
      db
        .insert(playerMatchStats)
        .values({ matchId: id, playerId, goals, assists, fouls, saves, goalkeeper, played: true })
        .onConflictDoUpdate({
          target: [playerMatchStats.matchId, playerMatchStats.playerId],
          set: { goals, assists, fouls, saves, goalkeeper, played: true },
        }),
    );
  }
  if (statements.length > 0) {
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0]);
  }

  revalidateMatchPages(id);
  revalidatePath("/players");
  revalidatePath(`/result/${id}`);
  // The cost split is derived from who played — keep costs & the slot in sync.
  revalidatePath("/costs");
  if (prev?.sessionId) revalidatePath(`/sessions/${prev.sessionId}`);

  // Full-time push to everyone, linking to the public result page. Best-effort.
  if (firstCompletion) {
    try {
      await notifyMatchResult(id);
    } catch {
      // ignore — result is already saved
    }

    // Cost due: if this match sits in a self-paid slot with a bill, nudge the
    // players who played to settle their share on the slot page.
    if (prev?.sessionId && playedIds.length > 0) {
      const slot = await db.query.sessions.findFirst({
        where: eq(sessions.id, prev.sessionId),
        columns: { id: true, cost: true, extraCost: true, paidBy: true },
      });
      if (slot && slot.paidBy === "self" && (slot.cost ?? 0) + (slot.extraCost ?? 0) > 0) {
        await notifyPlayers(playedIds, {
          type: "cost",
          title: "💸 Payment due",
          body: "You played a slot that's split between players — tap to settle your share.",
          url: `/sessions/${slot.id}`,
        });
      }
    }
  }
}
