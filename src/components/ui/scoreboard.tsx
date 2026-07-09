export function Scoreboard({
  home,
  away,
  size = "md",
}: {
  home: number | null;
  away: number | null;
  size?: "md" | "lg";
}) {
  const digit =
    size === "lg"
      ? "min-w-16 px-4 py-2 text-4xl sm:text-5xl"
      : "min-w-8 px-2 py-0.5 text-lg";
  return (
    <div className="scoreboard inline-flex items-center gap-1">
      <span className={`score-glow rounded-md border border-line bg-black/60 text-center font-bold text-gold-300 ${digit}`}>
        {home ?? "–"}
      </span>
      <span className="px-0.5 font-bold text-ink-400">:</span>
      <span className={`score-glow rounded-md border border-line bg-black/60 text-center font-bold text-gold-300 ${digit}`}>
        {away ?? "–"}
      </span>
    </div>
  );
}
