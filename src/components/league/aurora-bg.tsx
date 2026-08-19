"use client";

import { useEffect, useRef } from "react";

// Public league page backdrop: one calm, slowly orbiting colour wash in
// Strativ orange + night-blue over a dark ground. Pure canvas, decorative
// only; honours prefers-reduced-motion (draws a single static frame).
export function AuroraBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const draw = (t: number) => {
      // Dark ground.
      const bg = ctx.createRadialGradient(w * 0.5, -h * 0.1, 0, w * 0.5, -h * 0.1, h * 1.3);
      bg.addColorStop(0, "#0a0f1a");
      bg.addColorStop(0.55, "#0a0f18");
      bg.addColorStop(1, "#05070d");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      const reach = Math.max(w, h) * 0.7;

      // Warm orange orbit.
      const ox = w * (0.5 + 0.28 * Math.cos(t * 0.00016));
      const oy = h * (0.4 + 0.22 * Math.sin(t * 0.00021));
      let g = ctx.createRadialGradient(ox, oy, 0, ox, oy, reach);
      g.addColorStop(0, "rgba(249,115,22,0.20)");
      g.addColorStop(0.5, "rgba(249,115,22,0.05)");
      g.addColorStop(1, "rgba(249,115,22,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Cool blue counter-orbit.
      const bx = w * (0.5 - 0.3 * Math.cos(t * 0.00013));
      const by = h * (0.6 - 0.2 * Math.sin(t * 0.00018));
      g = ctx.createRadialGradient(bx, by, 0, bx, by, reach);
      g.addColorStop(0, "rgba(56,120,220,0.16)");
      g.addColorStop(1, "rgba(56,120,220,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "source-over";
    };

    if (reduce) {
      const onResize = () => {
        resize();
        draw(0);
      };
      draw(0);
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    let raf = 0;
    let start = 0;
    const loop = (now: number) => {
      if (!start) start = now;
      draw(now - start);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      {/* Depth vignette so the content stays legible over the wash. */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(125% 100% at 50% 24%, transparent 42%, rgba(0,0,0,0.66) 100%)" }}
      />
    </div>
  );
}
