import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { getSession } from "@/server/auth";

type AuditEntry = {
  action: string; // dotted verb, e.g. "player.position.set"
  entity?: string; // "player" | "team" | "match" | "staff" | "season" | …
  entityId?: string | null;
  summary: string; // human-readable one-liner
};

// Record one audit entry, attributed to the signed-in user. Best-effort: a
// logging failure must never break the action it's tracking, so all errors are
// swallowed. Call it AFTER the change has been persisted.
export async function recordAudit(entry: AuditEntry) {
  try {
    const session = await getSession();
    await db.insert(auditLogs).values({
      actorUserId: session?.user?.id ?? null,
      actorEmail: session?.user?.email ?? null,
      action: entry.action,
      entity: entry.entity ?? null,
      entityId: entry.entityId ?? null,
      summary: entry.summary,
    });
  } catch {
    // never break the underlying action because auditing failed
  }
}
