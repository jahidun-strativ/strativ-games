// Animated, drifting aurora backdrop for the public league page. Pure CSS
// (keyframes in globals.css); honours prefers-reduced-motion. Decorative only.
export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,#16233a_0%,#0a1018_55%,#060910_100%)]" />

      <div
        className="ssm-aurora-a absolute -left-32 -top-40 h-[46rem] w-[46rem] rounded-full opacity-60 blur-[90px]"
        style={{ background: "radial-gradient(circle, rgba(249,115,22,0.5), rgba(249,115,22,0) 62%)" }}
      />
      <div
        className="ssm-aurora-b absolute -right-32 top-1/4 h-[42rem] w-[42rem] rounded-full opacity-50 blur-[90px]"
        style={{ background: "radial-gradient(circle, rgba(52,211,153,0.42), rgba(52,211,153,0) 62%)" }}
      />
      <div
        className="ssm-aurora-c absolute -bottom-32 left-1/4 h-[40rem] w-[40rem] rounded-full opacity-50 blur-[90px]"
        style={{ background: "radial-gradient(circle, rgba(56,189,248,0.4), rgba(56,189,248,0) 62%)" }}
      />
      <div
        className="ssm-aurora-a absolute left-1/2 top-1/3 h-[30rem] w-[30rem] rounded-full opacity-40 blur-[80px]"
        style={{ background: "radial-gradient(circle, rgba(245,184,31,0.34), rgba(245,184,31,0) 62%)" }}
      />

      {/* Slow rotating sheen for a touch of motion across the whole field. */}
      <div
        className="ssm-aurora-spin absolute left-1/2 top-1/2 h-[130rem] w-[130rem] opacity-[0.05]"
        style={{
          transform: "translate(-50%, -50%)",
          background:
            "conic-gradient(from 0deg, transparent, rgba(249,115,22,0.5) 12%, transparent 30%, rgba(56,189,248,0.4) 55%, transparent 72%, rgba(52,211,153,0.4) 90%, transparent)",
        }}
      />

      {/* Depth vignette so the content stays legible over the glow. */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(125% 100% at 50% 28%, transparent 44%, rgba(0,0,0,0.62) 100%)" }}
      />
    </div>
  );
}
