"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { matches, pushSubscriptions, sessions, teams } from "@/db/schema";
import { requireAdmin } from "@/server/auth";
import { opt, optInt, str } from "@/server/form";
import { pushConfigured } from "@/lib/push";
import { getNotificationSettings } from "@/server/queries/notification-settings";
import { notifySessionCreated } from "@/server/notify-match";
import { seedDefaultAvailability } from "@/server/seed-availability";
import type { NotifyResult } from "@/server/actions/matches";

// Manually (re)send a slot's notification to everyone — ignores the toggle.
export async function resendSessionNotification(id: string): Promise<NotifyResult> {
  await requireAdmin();
  const sent = await db.$count(pushSubscriptions);
  await notifySessionCreated(id);
  return { sent, configured: pushConfigured };
}

function revalidateSessionPages(id?: string) {
  revalidatePath("/matches");
  revalidatePath("/venues");
  revalidatePath("/");
  if (id) revalidatePath(`/sessions/${id}`);
}

type PlannedFixture = {
  homeTeamId: string;
  awayTeamId: string;
  offsetMin: number; // minutes after the slot start
  durationMin: number;
  breakMin: number;
  orderIndex: number;
};

// Round-robin among 3 teams: A–B, A–C, B–C, each 25 min + 5 min break,
// staggered 30 min apart so they fit a 90-min slot.
function threeTeamRoundRobin(ids: string[]): PlannedFixture[] {
  const pairs: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 2],
  ];
  return pairs.map(([h, a], i) => ({
    homeTeamId: ids[h],
    awayTeamId: ids[a],
    offsetMin: i * 30,
    durationMin: 25,
    breakMin: 5,
    orderIndex: i,
  }));
}

async function sportForTeams(teamIds: string[]): Promise<string> {
  const rows = await db.select().from(teams).where(inArray(teams.id, teamIds));
  if (rows.length !== teamIds.length) throw new Error("Some selected teams no longer exist.");
  const sportIds = new Set(rows.map((t) => t.sportId));
  if (sportIds.size > 1) throw new Error("All teams in a slot must be in the same sport.");
  return rows[0].sportId;
}

/** Book a slot and auto-create its fixtures (single game or 3-team round-robin). */
export async function createSession(formData: FormData) {
  await requireAdmin();

  const venueId = str(formData, "venueId");
  const startAt = new Date(str(formData, "startAt"));
  if (Number.isNaN(startAt.getTime())) throw new Error("Invalid start time.");
  const kind = opt(formData, "kind") === "competitive" ? "competitive" : "internal";
  const cost = optInt(formData, "cost");
  const paidBy = opt(formData, "paidBy") === "self" ? "self" : "office";
  const title = opt(formData, "title");
  const notes = opt(formData, "notes");

  let sportId: string;
  let planned: PlannedFixture[];

  if (kind === "competitive") {
    const ourTeamId = opt(formData, "ourTeamId");
    let opponentId = opt(formData, "opponentId");
    // An opponent we're playing doesn't need a roster — we can log a game with
    // just their name. Create a name-only external team on the fly.
    const opponentName = opt(formData, "opponentName")?.trim();
    if (!ourTeamId) throw new Error("Pick your team.");
    if (!opponentId && !opponentName) {
      throw new Error("Pick an opponent from the list or type their name.");
    }
    const ourTeam = await db.query.teams.findFirst({ where: eq(teams.id, ourTeamId) });
    if (!ourTeam) throw new Error("Your team no longer exists.");
    sportId = ourTeam.sportId;
    if (opponentId) {
      if (ourTeamId === opponentId) throw new Error("Team and opponent must differ.");
      const opp = await db.query.teams.findFirst({ where: eq(teams.id, opponentId) });
      if (!opp) throw new Error("That opponent no longer exists.");
      if (opp.sportId !== sportId) throw new Error("Opponent must be in the same sport.");
    } else {
      const [opp] = await db
        .insert(teams)
        .values({ name: opponentName!, kind: "external", sportId })
        .returning();
      opponentId = opp.id;
    }
    const home = opt(formData, "isHome") !== "away";
    planned = [
      {
        homeTeamId: home ? ourTeamId : opponentId,
        awayTeamId: home ? opponentId : ourTeamId,
        offsetMin: 0,
        durationMin: 90,
        breakMin: 10,
        orderIndex: 0,
      },
    ];
  } else {
    const teamIds = (opt(formData, "teamIds") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (teamIds.length < 2 || teamIds.length > 3) {
      throw new Error("Pick 2 or 3 internal teams for the slot.");
    }
    if (new Set(teamIds).size !== teamIds.length) throw new Error("Teams must be different.");
    sportId = await sportForTeams(teamIds);
    planned =
      teamIds.length === 2
        ? [
            {
              homeTeamId: teamIds[0],
              awayTeamId: teamIds[1],
              offsetMin: 0,
              durationMin: 90,
              breakMin: 10,
              orderIndex: 0,
            },
          ]
        : threeTeamRoundRobin(teamIds);
  }

  const [session] = await db
    .insert(sessions)
    .values({ sportId, venueId, kind, title, notes, cost, paidBy, startAt, status: "scheduled" })
    .returning();

  const fixtures = await db
    .insert(matches)
    .values(
      planned.map((f) => ({
        sessionId: session.id,
        orderIndex: f.orderIndex,
        durationMin: f.durationMin,
        breakMin: f.breakMin,
        sportId,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        kind,
        venueId,
        kickoffAt: new Date(startAt.getTime() + f.offsetMin * 60_000),
        status: "scheduled",
      })),
    )
    .returning({ id: matches.id, homeTeamId: matches.homeTeamId, awayTeamId: matches.awayTeamId });

  // Opt-out RSVP: everyone on the scheduled teams starts as "in".
  for (const f of fixtures) {
    await seedDefaultAvailability(f.id, [f.homeTeamId, f.awayTeamId]);
  }

  // Notify subscribers (gated by the same toggle as matches) before redirecting.
  const settings = await getNotificationSettings();
  if (settings.notifyOnCreate) await notifySessionCreated(session.id).catch(() => {});

  revalidateSessionPages(session.id);
  redirect(`/sessions/${session.id}`);
}

export async function cancelSession(id: string) {
  await requireAdmin();
  await db.update(sessions).set({ status: "cancelled" }).where(eq(sessions.id, id));
  await db.update(matches).set({ status: "cancelled" }).where(eq(matches.sessionId, id));
  revalidateSessionPages(id);
}

export async function deleteSession(id: string) {
  await requireAdmin();
  // Fixtures cascade-delete via the FK.
  await db.delete(sessions).where(eq(sessions.id, id));
  revalidateSessionPages();
  redirect("/matches");
}
