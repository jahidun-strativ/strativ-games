import { notFound } from "next/navigation";
import { accountViewPaths } from "@neondatabase/auth-ui/server";
import { AccountView } from "@/components/account-view";
import { PageHeader } from "@/components/ui/page-header";
import { PushToggle } from "@/components/pwa/push-toggle";
import { NotificationSettingsCard } from "@/components/notification-settings-card";
import { isAdmin } from "@/server/auth";
import { getNotificationSettings } from "@/server/queries/notification-settings";

export const metadata = { title: "Account" };

// Any real account sub-view is allowed so AccountView's own nav never 404s;
// only genuinely unknown paths fall through to notFound().
const ALLOWED = new Set<string>(Object.values(accountViewPaths));

export default async function AccountPage({
  params,
}: PageProps<"/account/[path]">) {
  const { path } = await params;
  if (!ALLOWED.has(path)) notFound();

  // Notification controls live under the main "settings" sub-view only.
  const showNotifications = path === accountViewPaths.SETTINGS;
  const [admin, settings] = showNotifications
    ? await Promise.all([isAdmin(), getNotificationSettings()])
    : [false, null];

  return (
    <div>
      <PageHeader kicker="Your account" title="Account settings" />
      <div className="tv-card p-4 sm:p-6">
        <AccountView path={path} />
      </div>

      {showNotifications && settings && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="tv-card flex flex-col gap-3 p-5">
            <h2 className="font-display text-lg text-ink-900">Notifications on this device</h2>
            <p className="text-sm text-ink-500">
              Turn push notifications on or off for the device you&apos;re using now.
            </p>
            <PushToggle />
          </div>

          <NotificationSettingsCard
            canEdit={admin}
            initial={{
              notifyOnCreate: settings.notifyOnCreate,
              notifyDayBefore: settings.notifyDayBefore,
              notifyHourBefore: settings.notifyHourBefore,
            }}
          />
        </div>
      )}
    </div>
  );
}
