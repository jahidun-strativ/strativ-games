// Loading placeholders used as Suspense fallbacks so navigation shows the
// page's real header/structure immediately while only the data region below
// renders a skeleton (instead of blanking the whole page).

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-cream-200 ${className}`} />;
}

/** A row of filter-select placeholders, matching FilterBar's layout. */
export function FilterBarSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="mb-5 flex flex-wrap gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-8 min-w-44 flex-1 sm:flex-none" />
      ))}
    </div>
  );
}

/** A responsive grid of card placeholders (teams, venues, match cards). */
export function CardGridSkeleton({
  count = 6,
  height = "h-28",
}: {
  count?: number;
  height?: string;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`tv-card-sm ${height}`} />
      ))}
    </div>
  );
}

/** A stack of row placeholders for tables/lists. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="tv-card divide-y divide-line overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 p-4">
          <div className="h-8 w-8 shrink-0 rounded-full bg-cream-200" />
          <div className="h-4 flex-1 rounded bg-cream-200" />
          <div className="h-4 w-16 rounded bg-cream-200" />
        </div>
      ))}
    </div>
  );
}
