// A procedurally-generated team banner: a deterministic gradient + subtle
// pattern + faint monogram derived from the team name and a seed. No image is
// stored — the same (name, seed) always renders the same banner. Pure and
// client-safe, so it works in the profile hero, the league cards, and the
// live "shuffle" preview.

type Variant = "hero" | "strip";

// Distinct, sporty gradient palettes (light → mid → deep).
const PALETTES: [string, string, string][] = [
  ["#fb8b4c", "#ea580c", "#7c2d12"], // orange
  ["#34d399", "#059669", "#064e3b"], // green
  ["#38bdf8", "#0284c7", "#0c4a6e"], // sky
  ["#f5b81f", "#d99e00", "#78350f"], // gold
  ["#a855f7", "#7c3aed", "#3b0764"], // violet
  ["#f87171", "#dc2626", "#7f1d1d"], // red
  ["#f472b6", "#be185d", "#500724"], // pink
  ["#2dd4bf", "#0d9488", "#134e4a"], // teal
  ["#818cf8", "#4f46e5", "#312e81"], // indigo
];

// FNV-1a hash → stable across server & client.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "") || name[0] || "?").toUpperCase();
}

export function TeamBanner({
  name,
  seed,
  variant = "hero",
  className,
}: {
  name: string;
  seed?: number | null;
  variant?: Variant;
  className?: string;
}) {
  const h = hash(`${name}#${seed ?? 0}`);
  const [c0, c1, c2] = PALETTES[h % PALETTES.length];
  const angle = 90 + (h % 5) * 28;
  const patternKind = Math.floor(h / 7) % 4;

  const patterns = [
    // diagonal stripes
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0 2px, transparent 2px 16px)",
    // dots
    "radial-gradient(rgba(255,255,255,0.12) 1.5px, transparent 1.7px)",
    // grid
    "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 22px), repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 22px)",
    // chevrons
    "repeating-linear-gradient(135deg, rgba(255,255,255,0.07) 0 2px, transparent 2px 18px)",
  ];

  return (
    <div
      aria-hidden
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{ backgroundImage: `linear-gradient(${angle}deg, ${c0}, ${c1} 55%, ${c2})` }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: patterns[patternKind],
          backgroundSize: patternKind === 1 ? "18px 18px" : undefined,
        }}
      />
      {/* Faint monogram */}
      <div
        className="pointer-events-none absolute top-1/2 select-none font-display font-bold leading-none text-white/15"
        style={{
          right: variant === "hero" ? "1.5rem" : "0.75rem",
          transform: "translateY(-50%)",
          fontSize: variant === "hero" ? "9rem" : "3.25rem",
        }}
      >
        {initials(name)}
      </div>
      {/* Bottom legibility fade for any overlaid text */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.55))" }}
      />
    </div>
  );
}
