import { AuthView } from "@neondatabase/auth-ui";
import { authViewPaths } from "@neondatabase/auth-ui/server";
import { AuthMarketing } from "@/components/auth-marketing";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export default async function AuthPage({
  params,
}: PageProps<"/auth/[path]">) {
  const { path } = await params;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Marketing panel */}
      <section className="relative hidden flex-col justify-center overflow-hidden border-r border-line p-12 lg:flex xl:p-16">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-burnt-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-pitch-600/15 blur-3xl" />
        <AuthMarketing />
      </section>

      {/* Auth form */}
      <section className="flex flex-col items-center justify-center gap-6 p-4 sm:p-8">
        {/* Compact brand for mobile, where the marketing panel is hidden */}
        <div className="text-center lg:hidden">
          <p className="font-display text-2xl text-burnt-400">
            STRATIV <span className="text-ink-900">GAMES</span>
          </p>
          <div className="stripes mx-auto mt-2 h-1 w-32 rounded-full" />
        </div>
        <div className="tv-card w-full max-w-md p-4 sm:p-6">
          <AuthView path={path} />
        </div>
      </section>
    </main>
  );
}
