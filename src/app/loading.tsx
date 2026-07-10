export default function Loading() {
  return (
    <div className="grain flex min-h-screen flex-col items-center justify-center gap-8">
      <div className="text-center">
        <p className="font-display text-3xl leading-none text-burnt-500">
          STRATIV
          <span className="block text-ink-900">GAMES</span>
        </p>
        <div className="stripes mx-auto mt-3 h-1 w-28 rounded-full" />
      </div>

      {/* Bouncing football with a shadow */}
      <div className="relative h-28 w-24">
        <span
          role="img"
          aria-label="football"
          className="ssm-ball absolute left-1/2 top-4 -ml-6 text-5xl"
        >
          ⚽
        </span>
        <span className="ssm-ball-shadow absolute bottom-2 left-1/2 -ml-7 h-2.5 w-14 rounded-full bg-black/60 blur-[3px]" />
      </div>

      <p className="scoreboard ssm-pulse text-xs uppercase tracking-[0.35em] text-ink-500">
        Warming up
      </p>
    </div>
  );
}
