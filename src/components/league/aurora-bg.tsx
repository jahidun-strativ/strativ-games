"use client";

import { useEffect, useRef } from "react";

// Cinematic "stadium night" backdrop for the public league page: sweeping
// floodlight beams (CSS, see globals.css) over a canvas field of drifting,
// twinkling crowd/camera bokeh. Decorative only; honours reduced-motion.

// Warm arena palette, weighted toward orange/gold so it reads Strativ.
const BOKEH = [
  "249,115,22", // burnt orange
  "249,115,22",
  "245,184,31", // gold
  "245,184,31",
  "52,211,153", // pitch green
  "255,238,210", // warm white (camera flashes)
];

type Dot = {
  x: number;
  y: number;
  r: number;
  color: string;
  alpha: number;
  vy: number; // upward drift, px/s
  vx: number;
  tw: number; // twinkle speed
  ph: number; // twinkle phase
};

function StadiumCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dots: Dot[] = [];

    const spawn = (bottom: boolean): Dot => {
      const r = 3 + Math.random() * 22;
      return {
        x: Math.random() * w,
        y: bottom ? h + r + Math.random() * h * 0.4 : Math.random() * h,
        r,
        color: BOKEH[Math.floor(Math.random() * BOKEH.length)],
        alpha: 0.12 + Math.random() * 0.42,
        vy: -(8 + Math.random() * 22),
        vx: (Math.random() - 0.5) * 8,
        tw: 0.5 + Math.random() * 1.6,
        ph: Math.random() * Math.PI * 2,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Density scales with area (cap keeps it cheap on big screens).
      const count = Math.min(70, Math.round((w * h) / 26000));
      dots = Array.from({ length: count }, () => spawn(false));
    };
    resize();

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const d of dots) {
        const flick = 0.65 + 0.35 * Math.sin(t * 0.001 * d.tw + d.ph);
        const a = d.alpha * flick;
        const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
        g.addColorStop(0, `rgba(${d.color},${a})`);
        g.addColorStop(1, `rgba(${d.color},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    if (reduce) {
      draw(0);
      const onResize = () => {
        resize();
        draw(0);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      for (const d of dots) {
        d.y += d.vy * dt;
        d.x += d.vx * dt;
        if (d.y + d.r < 0) Object.assign(d, spawn(true));
      }
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

export function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Dark arena base. */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,#182a44_0%,#0b1220_52%,#05070d_100%)]" />

      {/* Floodlight beams sweeping from the top corners. */}
      <div
        className="ssm-beam-l absolute -top-[30%] left-[16%] h-[150%] w-[34rem] blur-[26px]"
        style={{
          transformOrigin: "top center",
          background: "linear-gradient(to bottom, rgba(255,232,190,0.20), rgba(255,232,190,0) 68%)",
          clipPath: "polygon(46% 0, 54% 0, 100% 100%, 0 100%)",
        }}
      />
      <div
        className="ssm-beam-r absolute -top-[30%] right-[16%] h-[150%] w-[34rem] blur-[26px]"
        style={{
          transformOrigin: "top center",
          background: "linear-gradient(to bottom, rgba(255,224,180,0.18), rgba(255,224,180,0) 68%)",
          clipPath: "polygon(46% 0, 54% 0, 100% 100%, 0 100%)",
        }}
      />

      {/* Lamp flares at the beam sources. */}
      <div
        className="ssm-flare absolute -top-6 left-[15%] h-24 w-24 rounded-full blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(255,240,210,0.55), rgba(255,240,210,0) 70%)" }}
      />
      <div
        className="ssm-flare absolute -top-6 right-[15%] h-24 w-24 rounded-full blur-2xl"
        style={{ background: "radial-gradient(circle, rgba(255,236,200,0.5), rgba(255,236,200,0) 70%)", animationDelay: "3s" }}
      />

      {/* Drifting crowd bokeh. */}
      <StadiumCanvas />

      {/* Warm pitch glow rising from the base. */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: "radial-gradient(120% 100% at 50% 130%, rgba(249,115,22,0.22), rgba(249,115,22,0) 70%)" }}
      />

      {/* Depth vignette so the content stays legible. */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(125% 100% at 50% 26%, transparent 42%, rgba(0,0,0,0.66) 100%)" }}
      />
    </div>
  );
}
