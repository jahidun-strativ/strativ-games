// Shown instantly on navigation between app pages (the sidebar/tab bar stays),
// so tab clicks feel responsive while the target page's data loads.
export default function AppLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-3 w-40 rounded bg-cream-200" />
        <div className="mt-2 h-8 w-56 rounded bg-cream-200" />
        <div className="stripes mt-4 h-1 rounded-full opacity-40" />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="tv-card-sm h-20" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="tv-card-sm h-28" />
        ))}
      </div>
    </div>
  );
}
