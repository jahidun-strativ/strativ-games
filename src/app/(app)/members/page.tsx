import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { appUsers } from "@/db/schema";
import { getSession, isAdmin } from "@/server/auth";
import { getNotificationSettings } from "@/server/queries/notification-settings";
import { PageHeader } from "@/components/ui/page-header";
import { MembersTable } from "@/components/members-table";
import { NotificationSettingsCard } from "@/components/notification-settings-card";

export const metadata = { title: "Members" };

export default async function MembersPage() {
  const [admin, session] = await Promise.all([isAdmin(), getSession()]);
  if (!admin) redirect("/");

  const [users, players, settings] = await Promise.all([
    db.query.appUsers.findMany({ orderBy: asc(appUsers.email) }),
    db.query.players.findMany({ columns: { userId: true, name: true } }),
    getNotificationSettings(),
  ]);
  const nameByUser = new Map(players.filter((p) => p.userId).map((p) => [p.userId, p.name]));

  return (
    <div>
      <PageHeader kicker="Admin console" title="Members & settings" />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="font-display mb-1 text-lg text-ink-900">Members</h2>
          <p className="mb-4 max-w-2xl text-sm text-ink-500">
            Admins can create and edit everything; members have read-only access.
            Promote teammates below.
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
        </section>

        <section>
          <NotificationSettingsCard
            initial={{
              notifyOnCreate: settings.notifyOnCreate,
              notifyDayBefore: settings.notifyDayBefore,
              notifyHourBefore: settings.notifyHourBefore,
            }}
          />
        </section>
      </div>
    </div>
  );
}
