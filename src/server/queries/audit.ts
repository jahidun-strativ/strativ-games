import { desc } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

// Most recent audit entries, newest first. Capped — the log is a rolling view,
// not a report; raise the limit or add paging if it ever needs deep history.
export async function getRecentAudit(limit = 300) {
  return db.query.auditLogs.findMany({
    orderBy: desc(auditLogs.createdAt),
    limit,
  });
}
