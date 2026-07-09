import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { appUsers } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { isAdmin } from "@/server/auth";
import { PageHeader } from "@/components/ui/page-header";
import { MembersTable } from "@/components/members-table";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const [admin, { data: session }] = await Promise.all([isAdmin(), auth.getSession()]);
  if (!admin) redirect("/");

  const [users, players] = await Promise.all([
    db.query.appUsers.findMany({ orderBy: asc(appUsers.email) }),
    db.query.players.findMany({ columns: { userId: true, name: true } }),
  ]);
  const nameByUser = new Map(players.filter((p) => p.userId).map((p) => [p.userId, p.name]));

  return (
    <div>
      <PageHeader
        kicker="Access control"
        title="Members"
      />
      <p className="mb-5 max-w-2xl text-sm text-ink-500">
        Admins can create and edit sports, teams, players, staff, venues and matches.
        Members have read-only access. Promote teammates below.
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
    </div>
  );
}
