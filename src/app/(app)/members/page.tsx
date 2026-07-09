import { Suspense } from "react";
import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { appUsers } from "@/db/schema";
import { getSession, isAdmin } from "@/server/auth";
import { PageHeader } from "@/components/ui/page-header";
import { MembersTable } from "@/components/members-table";
import { TableSkeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Members" };

async function MembersContent() {
  const [admin, session] = await Promise.all([isAdmin(), getSession()]);
  if (!admin) redirect("/");

  const [users, players] = await Promise.all([
    db.query.appUsers.findMany({ orderBy: asc(appUsers.email) }),
    db.query.players.findMany({ columns: { userId: true, name: true } }),
  ]);
  const nameByUser = new Map(players.filter((p) => p.userId).map((p) => [p.userId, p.name]));

  return (
    <>
      <p className="mb-4 max-w-2xl text-sm text-ink-500">
        Admins can create and edit everything; members have read-only access.
        Promote teammates below. Match-notification timing lives in{" "}
        <span className="font-semibold text-ink-700">Account settings</span>.
      </p>
      <MembersTable
        meUserId={session?.user?.id ?? ""}
        members={users.map((u) => ({
          userId: u.userId,
          email: u.email,
          name: nameByUser.get(u.userId) ?? null,
          role: u.role,
        }))}
      />
    </>
  );
}

export default function MembersPage() {
  return (
    <div>
      <PageHeader kicker="Admin console" title="Members" />

      <Suspense fallback={<TableSkeleton rows={6} />}>
        <MembersContent />
      </Suspense>
    </div>
  );
}
