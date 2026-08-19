import { notFound } from "next/navigation";
import { getSeasonById, getSeasonView } from "@/server/queries/season";
import { SeasonBoard } from "@/components/league/season-board";
import { AuroraBackground } from "@/components/league/aurora-bg";

export const metadata = { title: "League" };
// Public, always-fresh standings (see proxy.ts — /league/<id> needs no sign-in).
export const dynamic = "force-dynamic";

export default async function PublicLeaguePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const season = await getSeasonById(id);
  if (!season) notFound();
  const view = await getSeasonView(season);

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <AuroraBackground />
      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-cream-50 font-display text-base">
            <span className="text-burnt-500">S</span>
            <span className="text-ink-900">G</span>
          </span>
          <p className="font-display text-lg tracking-widest text-ink-900">STRATIV GAMES</p>
        </div>

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-500">
            {season.status === "ended" ? "● Final standings" : "● Live standings"}
          </p>
          <h1 className="font-display text-3xl text-ink-900">{season.name}</h1>
        </div>

        <SeasonBoard view={view} />
      </div>
    </div>
  );
}
