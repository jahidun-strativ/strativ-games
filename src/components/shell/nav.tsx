"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppstoreOutlined,
  CalendarOutlined,
  DribbbleOutlined,
  EnvironmentOutlined,
  FlagOutlined,
  IdcardOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

type NavLink = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
};

const links: NavLink[] = [
  { href: "/", label: "Dashboard", icon: <AppstoreOutlined />, exact: true },
  { href: "/matches", label: "Matches", icon: <CalendarOutlined /> },
  { href: "/teams", label: "Teams", icon: <FlagOutlined /> },
  { href: "/players", label: "Players", icon: <UserOutlined /> },
  { href: "/stats", label: "Stats", icon: <TrophyOutlined /> },
  { href: "/staff", label: "Staff", icon: <IdcardOutlined /> },
  { href: "/sports", label: "Sports", icon: <DribbbleOutlined /> },
  { href: "/venues", label: "Venues", icon: <EnvironmentOutlined /> },
];

// Bottom tab bar shows the 5 most-used destinations; the rest live in the sidebar.
const mobileLinks = links.filter((l) =>
  ["/", "/matches", "/teams", "/players", "/stats"].includes(l.href),
);

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] !text-ink-400">
        Menu
      </p>
      {links.map((link) => {
        const active = isActive(pathname, link.href, link.exact);
        return (
          <Link
            key={link.href}
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
        );
      })}
    </nav>
  );
}

export function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav className="glass-bar fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-5">
        {mobileLinks.map((link) => {
          const active = isActive(pathname, link.href, link.exact);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 py-2 text-[10px] font-semibold ${
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
      </div>
    </nav>
  );
}
