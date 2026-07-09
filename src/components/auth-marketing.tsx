"use client";

import {
  CalendarOutlined,
  EnvironmentOutlined,
  LineChartOutlined,
  TeamOutlined,
} from "@ant-design/icons";

const features = [
  {
    icon: <CalendarOutlined />,
    title: "Fixtures & venue booking",
    text: "Schedule matches with real venue bookings and a double-booking guard.",
  },
  {
    icon: <LineChartOutlined />,
    title: "Live stats & standings",
    text: "Record results once — leaderboards and league tables update themselves.",
  },
  {
    icon: <TeamOutlined />,
    title: "Squads & lineups",
    text: "Manage rosters and set your XI on a visual tactics board.",
  },
  {
    icon: <EnvironmentOutlined />,
    title: "Every ground, one place",
    text: "Track capacity, booking notes and upcoming matches per venue.",
  },
];

export function AuthMarketing() {
  return (
    <div className="relative">
      <p className="font-display text-4xl leading-tight text-burnt-400 xl:text-5xl">
        STRATIV <span className="text-ink-900">GAMES</span>
      </p>
      <div className="stripes mt-3 h-1 w-32 rounded-full" />

      <h1 className="mt-8 max-w-lg text-3xl font-bold leading-tight text-ink-900 xl:text-4xl">
        Run your club like the pros.
      </h1>
      <p className="mt-3 max-w-md text-base text-ink-500">
        One control room for teams, players, fixtures, venues and stats — built
        for Strativ&apos;s matchdays.
      </p>

      <ul className="mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <li key={f.title} className="tv-card-sm glossy p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-burnt-500/15 text-lg text-burnt-400">
              {f.icon}
            </span>
            <p className="mt-3 text-sm font-bold text-ink-900">{f.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">{f.text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex items-center gap-6">
        {[
          ["21+", "players"],
          ["3", "squads"],
          ["∞", "matchdays"],
        ].map(([value, label]) => (
          <div key={label}>
            <p className="scoreboard score-glow text-2xl font-bold text-gold-300">{value}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              {label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
