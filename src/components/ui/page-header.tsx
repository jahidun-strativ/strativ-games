import type { ReactNode } from "react";

export function PageHeader({
  title,
  kicker,
  actions,
}: {
  title: string;
  kicker?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {kicker ? (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-burnt-400">
              {kicker}
            </p>
          ) : null}
          <h1 className="font-display text-3xl text-ink-900 sm:text-4xl">{title}</h1>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      <div className="stripes mt-4 h-1 rounded-full opacity-80" />
    </header>
  );
}
