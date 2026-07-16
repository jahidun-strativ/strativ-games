import Link from "next/link";
import { redirect } from "next/navigation";
import { isAllowedEmail } from "@/lib/auth/allowed";
import { getSession, getRole } from "@/server/auth";
import { ensurePlayerForUser } from "@/server/ensure-player";
import { ensureAppUser } from "@/server/ensure-user";
import { SidebarNav, BottomTabs } from "@/components/shell/nav";
import { AppUserButton } from "@/components/shell/user-button";
import { NotificationBell } from "@/components/shell/notification-bell";
import { PushAutoPrompt } from "@/components/pwa/push-auto-prompt";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in");
  if (!isAllowedEmail(session.user.email)) redirect("/blocked");
  const user = session.user;

  // Independent work — run together instead of one after another.
  const [, , role] = await Promise.all([
    ensureAppUser(user),
    ensurePlayerForUser(user),
    getRole(user.id),
  ]);
  const admin = role === "admin";

  return (
    // Pin the shell to the viewport; only the content column scrolls, so the
    // sidebar and mobile top bar stay put. (A plain `sticky` sidebar breaks here
    // because `overflow-x-hidden` makes an ancestor the scroll container.)
    <div className="flex h-screen w-full overflow-hidden">
      {/* Desktop sidebar — full height, its own scroll if the menu ever overflows */}
      <aside className="glass-bar hidden h-screen w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-line p-4 md:flex">
        <Link href="/" className="block px-1 pt-1">
          <p className="font-display text-2xl leading-none text-burnt-500">
            STRATIV
            <span className="block text-ink-900">GAMES</span>
          </p>
          <div className="stripes mt-2 h-1 w-24 rounded-full" />
        </Link>
        <SidebarNav admin={admin} />
        <div className="mt-auto space-y-3 border-t border-line pt-4">
          <NotificationBell />
          <AppUserButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Mobile top bar — sticks to the top of the scrolling content column */}
        <header className="glass-bar sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-line px-4 py-3 md:hidden">
          <Link href="/" className="font-display truncate text-lg text-burnt-500">
            STRATIV <span className="text-ink-900">GAMES</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell compact />
            <AppUserButton compact />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10">
          {children}
        </main>
      </div>

      <BottomTabs admin={admin} />
      <PushAutoPrompt />
    </div>
  );
}
