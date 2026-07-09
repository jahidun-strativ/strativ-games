import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { isAllowedEmail } from "@/lib/auth/allowed";
import { ensurePlayerForUser } from "@/server/ensure-player";
import { SidebarNav, BottomTabs } from "@/components/shell/nav";
import { AppUserButton } from "@/components/shell/user-button";
import { PushToggle } from "@/components/pwa/push-toggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");
  if (!isAllowedEmail(session.user.email)) redirect("/blocked");

  // Registered users are the source of the player roster.
  await ensurePlayerForUser(session.user);

  return (
    <div className="flex min-h-screen w-full">
      {/* Desktop sidebar */}
      <aside className="glass-bar sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-6 border-r border-line p-4 md:flex">
        <Link href="/" className="block px-1 pt-1">
          <p className="font-display text-2xl leading-none text-burnt-500">
            STRATIV
            <span className="block text-ink-900">GAMES</span>
          </p>
          <div className="stripes mt-2 h-1 w-24 rounded-full" />
        </Link>
        <SidebarNav />
        <div className="mt-auto space-y-3 border-t border-line pt-4">
          <PushToggle />
          <AppUserButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="glass-bar sticky top-0 z-40 flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
          <Link href="/" className="font-display text-lg text-burnt-500">
            STRATIV <span className="text-ink-900">GAMES</span>
          </Link>
          <AppUserButton />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10">
          {children}
        </main>
      </div>

      <BottomTabs />
    </div>
  );
}
