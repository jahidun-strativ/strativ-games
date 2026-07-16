import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gt, lte } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { getNotificationSettings } from "@/server/queries/notification-settings";
import { notifyMatchToAll } from "@/server/notify-match";

export const dynamic = "force-dynamic";

// Dhaka is a fixed UTC+6 (no DST), so we can shift by a constant offset instead
// of pulling in a tz library just to find "end of today" in local time.
const BD_OFFSET_MS = 6 * 60 * 60 * 1000;

// Called once daily; scheduled at 08:00 UTC = 14:00 (2 PM) Bangladesh time.
// Sends ONE reminder for every match happening later THAT day — so for a typical
// evening kickoff it lands ~5-6 hours ahead. Protected by CRON_SECRET.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.nextUrl.searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getNotificationSettings();
  if (!settings.notifyHourBefore) {
    return NextResponse.json({ ok: true, sent: 0, skipped: "match-day reminder off" });
  }

  const now = new Date();
  // End of today in Bangladesh time, expressed as a UTC instant.
  const bdNow = new Date(now.getTime() + BD_OFFSET_MS);
  const bdEndOfDay = Date.UTC(
    bdNow.getUTCFullYear(),
    bdNow.getUTCMonth(),
    bdNow.getUTCDate(),
    23,
    59,
    59,
    999,
  );
  const endOfTodayUtc = new Date(bdEndOfDay - BD_OFFSET_MS);

  // Match-day reminder: scheduled matches with kickoff still ahead but before
  // midnight (BD) today. `remindedHourBefore` dedupes if the cron runs again.
  const due = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        eq(matches.status, "scheduled"),
        eq(matches.remindedHourBefore, false),
        gt(matches.kickoffAt, now),
        lte(matches.kickoffAt, endOfTodayUtc),
      ),
    );

  let sent = 0;
  for (const m of due) {
    await notifyMatchToAll(m.id, "today").catch(() => {});
    await db
      .update(matches)
      .set({ remindedHourBefore: true, remindedDayBefore: true })
      .where(eq(matches.id, m.id));
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
