import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isAdmin } from "@/server/auth";
import { getRecentAudit } from "@/server/queries/audit";
import { AuditLog } from "@/components/audit-log";
import { PageHeader } from "@/components/ui/page-header";
import { TableSkeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

async function AuditContent() {
  if (!(await isAdmin())) redirect("/");
  const rows = await getRecentAudit();
  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-ink-500">
        Every meaningful change in the system — who did what, and when. Showing the most recent{" "}
        {rows.length} entries.
      </p>
      <AuditLog rows={rows} />
    </>
  );
}

export default function AuditPage() {
  return (
    <div>
      <PageHeader kicker="System" title="Audit log" />
      <Suspense fallback={<TableSkeleton rows={10} />}>
        <AuditContent />
      </Suspense>
    </div>
  );
}
