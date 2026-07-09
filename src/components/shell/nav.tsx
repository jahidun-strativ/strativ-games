"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Drawer } from "antd";
import {
  AppstoreOutlined,
  CalendarOutlined,
  DribbbleOutlined,
  EllipsisOutlined,
  EnvironmentOutlined,
  FlagOutlined,
  IdcardOutlined,
  SafetyOutlined,
  SettingOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

type NavLink = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
  adminOnly?: boolean;
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
  { href: "/members", label: "Members", icon: <SafetyOutlined />, adminOnly: true },
];

// Bottom tab bar shows the 5 most-used destinations; the rest live in the sidebar.
const mobileLinks = links.filter((l) =>
  ["/", "/matches", "/teams", "/players", "/stats"].includes(l.href),
);

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const visible = links.filter((l) => !l.adminOnly || admin);
  return (
    <nav className="flex flex-col gap-1">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] !text-ink-400">
        Menu
      </p>
      {visible.map((link) => {
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

export function BottomTabs({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Everything the primary tabs don't cover — so the full app is reachable on
  // mobile, not just the 5 pinned tabs. Account lives only here.
  const overflow: NavLink[] = [
    ...links.filter((l) => !mobileLinks.includes(l) && (!l.adminOnly || admin)),
    { href: "/account/settings", label: "Account & notifications", icon: <SettingOutlined /> },
  ];
  // Light up the More tab whenever the current page isn't one of the pinned tabs.
  const onOverflow = !mobileLinks.some((l) => isActive(pathname, l.href, l.exact));

  return (
    <nav className="glass-bar fixed inset-x-0 bottom-0 z-40 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="grid grid-cols-6">
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

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-1 py-2 text-[10px] font-semibold ${
            onOverflow ? "!text-burnt-400" : "!text-ink-500"
          }`}
        >
          <span
            className={`flex h-7 w-12 items-center justify-center rounded-full text-base ${
              onOverflow ? "bg-burnt-500/20" : ""
            }`}
          >
            <EllipsisOutlined />
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
