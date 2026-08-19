"use client";

import { useState } from "react";

// Small League / Overall (etc.) toggle. Panels are rendered on the server and
// passed in; only the active one is shown. Reused by player & team profiles.
export function StatTabs({ tabs }: { tabs: { label: string; panel: React.ReactNode }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="mb-4 inline-flex rounded-full border border-line bg-cream-50 p-1">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              i === active ? "bg-burnt-500 text-white" : "text-ink-500 hover:text-ink-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{tabs[active]?.panel}</div>
    </div>
  );
}
