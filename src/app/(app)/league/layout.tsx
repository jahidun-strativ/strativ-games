import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { db } from "@/db";
import { isAdmin } from "@/server/auth";
import { getActiveSeason } from "@/server/queries/season";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { LeagueTabs } from "@/components/league/league-tabs";
import { CreateSeasonButton } from "@/components/league/create-season-button";
import { SeasonStatusButton } from "@/components/league/season-admin";

// Live standings — recomputed on every visit so a just-recorded result shows.
export const dynamic = "force-dynamic";

// Shell for the whole League section: resolves the active season once, shows the
// season branding + the submenu tabs, then renders the active sub-page. Sub-pages
// early-return null when there's no season (this layout owns that empty state).
export default async function LeagueLayout({ children }: { children: React.ReactNode }) {
  const [admin, season] = await Promise.all([isAdmin(), getActiveSeason()]);

  if (!season) {
    const sports = admin ? await db.query.sports.findMany() : [];
    return (
      <div>
        <PageHeader kicker="League office" title="League" />
        <EmptyState
          title="No active season"
          hint={
            admin
              ? "Start a season to open standings, fixtures and awards."
              : "The league hasn't started yet — check back once a season is live."
          }
          action={admin ? <CreateSeasonButton sports={sports} /> : undefined}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        kicker={season.status === "ended" ? "League office · Final" : "League office"}
        title={season.name}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/league/${season.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-burnt-500 hover:text-burnt-400"
            >
              <ExternalLink className="h-4 w-4" />
              Public page
            </Link>
            {admin ? <SeasonStatusButton season={season} /> : null}
          </div>
        }
      />
      <LeagueTabs admin={admin} />
      {children}
    </div>
  );
}
