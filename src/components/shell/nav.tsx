"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Drawer } from "antd";
import {
  LayoutDashboard,
  CalendarDays,
  Trophy,
  Shield,
  Users,
  BarChart3,
  Briefcase,
  Dribbble,
  MapPin,
  Wallet,
  ShieldCheck,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import type { ReactNode } from "react";

type SubLink = { href: string; label: string; adminOnly?: boolean };
type NavLink = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
  adminOnly?: boolean;
  children?: SubLink[];
};

const ICON = 20;
const links: NavLink[] = [
  { href: "/", label: "Dashboard", icon: <LayoutDashboard size={ICON} />, exact: true },
  { href: "/matches", label: "Matches", icon: <CalendarDays size={ICON} /> },
  {
    href: "/league",
    label: "League",
    icon: <Trophy size={ICON} />,
    children: [
      { href: "/league/teams", label: "Teams" },
      { href: "/league/matches", label: "Matches" },
      { href: "/league/settings", label: "Settings", adminOnly: true },
    ],
  },
  { href: "/teams", label: "Teams", icon: <Shield size={ICON} /> },
  { href: "/players", label: "Players", icon: <Users size={ICON} /> },
  { href: "/stats", label: "Stats", icon: <BarChart3 size={ICON} /> },
  { href: "/staff", label: "Staff", icon: <Briefcase size={ICON} /> },
  { href: "/sports", label: "Sports", icon: <Dribbble size={ICON} /> },
  { href: "/venues", label: "Venues", icon: <MapPin size={ICON} /> },
  { href: "/costs", label: "Costs", icon: <Wallet size={ICON} /> },
  { href: "/members", label: "Members", icon: <ShieldCheck size={ICON} />, adminOnly: true },
];

// Bottom tab bar pins the 4 most-used destinations; everything else (including
// Stats) lives in the More drawer.
const mobileLinks = links.filter((l) =>
  ["/", "/matches", "/teams", "/players"].includes(l.href),
);

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const visible = links.filter((l) => !l.adminOnly || admin);
  return (
    <nav className="flex flex-col gap-1">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.2em] !text-ink-400">
        Menu
      </p>
      {visible.map((link) => {
        const active = isActive(pathname, link.href, link.exact);
        // A parent's submenu reveals itself while you're anywhere in its section.
        const inSection = pathname === link.href || pathname.startsWith(link.href + "/");
        const kids = (link.children ?? []).filter((c) => !c.adminOnly || admin);
        return (
          <div key={link.href}>
            <Link
              href={link.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                active
                  ? "bg-burnt-500/15 !text-burnt-400"
                  : "!text-ink-700 hover:bg-cream-200 hover:!text-ink-900"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-base transition-colors ${
                  active
                    ? "glow-orange bg-gradient-to-br from-burnt-500 to-burnt-600 !text-white"
                    : "bg-cream-200 text-ink-500 group-hover:text-ink-900"
                }`}
              >
                {link.icon}
              </span>
              {link.label}
            </Link>
            {kids.length > 0 && inSection ? (
              <div className="mb-1 ml-[26px] mt-1 flex flex-col gap-0.5 border-l border-line pl-3">
                {kids.map((c) => {
                  const cActive = pathname === c.href || pathname.startsWith(c.href + "/");
                  return (
                    <Link
                      key={c.href}
                      href={c.href}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                        cActive ? "!text-burnt-400" : "!text-ink-500 hover:!text-ink-900"
                      }`}
                    >
                      {c.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export function BottomTabs({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Everything the primary tabs don't cover — so the full app is reachable on
  // mobile, not just the 5 pinned tabs. Account lives only here.
  const overflow: NavLink[] = [
    ...links.filter((l) => !mobileLinks.includes(l) && (!l.adminOnly || admin)),
    { href: "/account/settings", label: "Account & notifications", icon: <Settings size={ICON} /> },
  ];
  // Light up the More tab whenever the current page isn't one of the pinned tabs.
  const onOverflow = !mobileLinks.some((l) => isActive(pathname, l.href, l.exact));

  return (
    <nav className="glass-bar fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-5">
        {mobileLinks.map((link) => {
          const active = isActive(pathname, link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 py-2 text-[11px] font-semibold ${
                active ? "!text-burnt-400" : "!text-ink-500"
              }`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full text-base ${
                  active ? "bg-burnt-500/20" : ""
                }`}
              >
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-1 py-2 text-[11px] font-semibold ${
            onOverflow ? "!text-burnt-400" : "!text-ink-500"
          }`}
        >
          <span
            className={`flex h-7 w-12 items-center justify-center rounded-full text-base ${
              onOverflow ? "bg-burnt-500/20" : ""
            }`}
          >
            <MoreHorizontal size={ICON} />
          </span>
          More
        </button>
      </div>

      <Drawer
        placement="bottom"
        height="auto"
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="More"
        styles={{ body: { padding: 12 } }}
      >
        <div className="grid grid-cols-3 gap-2">
          {overflow.map((link) => {
            const active = isActive(pathname, link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMoreOpen(false)}
                className={`flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-burnt-500/15 !text-burnt-400"
                    : "!text-ink-700 hover:bg-cream-200"
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cream-200 text-lg text-ink-500">
                  {link.icon}
                </span>
                <span className="text-center leading-tight">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </Drawer>
    </nav>
  );
}
