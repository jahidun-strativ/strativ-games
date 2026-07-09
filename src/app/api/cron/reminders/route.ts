import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gt, lte } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { getNotificationSettings } from "@/server/queries/notification-settings";
import { notifyMatchToAll } from "@/server/notify-match";

export const dynamic = "force-dynamic";

// Called once daily (Vercel Hobby limit) to send day-before and same-day
// match reminders. Protected by CRON_SECRET. Schedule: 08:00 Bangladesh time.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.nextUrl.searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getNotificationSettings();
  const now = new Date();
  const h = (n: number) => new Date(now.getTime() + n * 60 * 60 * 1000);

  let dayCount = 0;
  let hourCount = 0;

  // Same-day reminder: kickoff within the next 12 hours (runs at 08:00 BD).
  if (settings.notifyHourBefore) {
    const due = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.status, "scheduled"),
          eq(matches.remindedHourBefore, false),
          gt(matches.kickoffAt, now),
          lte(matches.kickoffAt, h(12)),
        ),
      );
    for (const m of due) {
      await notifyMatchToAll(m.id, "hour").catch(() => {});
      await db
        .update(matches)
        .set({ remindedHourBefore: true, remindedDayBefore: true })
        .where(eq(matches.id, m.id));
      hourCount++;
    }
  }

  // Day-before reminder: kickoff roughly 20–28 hours ahead (tomorrow ~same time).
  if (settings.notifyDayBefore) {
    const due = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.status, "scheduled"),
          eq(matches.remindedDayBefore, false),
          gt(matches.kickoffAt, h(12)),
          lte(matches.kickoffAt, h(28)),
        ),
      );
    for (const m of due) {
      await notifyMatchToAll(m.id, "day").catch(() => {});
      await db
        .update(matches)
        .set({ remindedDayBefore: true })
        .where(eq(matches.id, m.id));
      dayCount++;
    }
  }

  return NextResponse.json({ ok: true, dayReminders: dayCount, hourReminders: hourCount });
}
