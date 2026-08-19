"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/league", label: "Overview", exact: true },
  { href: "/league/fixtures", label: "Fixtures" },
  { href: "/league/teams", label: "Teams" },
  { href: "/league/stats", label: "Stats" },
  { href: "/league/awards", label: "Awards" },
  { href: "/league/season", label: "Season", adminOnly: true },
] as const;

// Secondary nav for the league section — mirrors the sidebar submenu so the
// league is browsable on mobile and inside the page too.
export function LeagueTabs({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const tabs = TABS.filter((t) => !("adminOnly" in t) || admin);
  return (
    <div className="mb-6 flex flex-wrap gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const active =
          "exact" in t && t.exact
            ? pathname === t.href
            : pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? "border-burnt-500 text-burnt-400"
                : "border-transparent text-ink-500 hover:text-ink-900"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
