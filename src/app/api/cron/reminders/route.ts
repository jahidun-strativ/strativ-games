import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gt, lte } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { getNotificationSettings } from "@/server/queries/notification-settings";
import { notifyMatchToAll } from "@/server/notify-match";

export const dynamic = "force-dynamic";

// Called on a schedule (e.g. every 15 min) to send 1-day-before and
// 1-hour-before match reminders. Protected by CRON_SECRET.
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
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  let dayCount = 0;
  let hourCount = 0;

  // 1 hour before: kickoff within the next hour, hour-reminder not yet sent.
  if (settings.notifyHourBefore) {
    const due = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.status, "scheduled"),
          eq(matches.remindedHourBefore, false),
          gt(matches.kickoffAt, now),
          lte(matches.kickoffAt, in1h),
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

  // 1 day before: kickoff within the next 24h (but not the 1h window handled
  // above), day-reminder not yet sent.
  if (settings.notifyDayBefore) {
    const due = await db
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.status, "scheduled"),
          eq(matches.remindedDayBefore, false),
          gt(matches.kickoffAt, in1h),
          lte(matches.kickoffAt, in24h),
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
