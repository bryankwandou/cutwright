"use client";

import { useEffect, useRef, useState } from "react";
import { renderTransition } from "@/lib/transitions";
import { TransitionKind } from "@/lib/types";
import { cn } from "@/lib/cn";

/** Four procedural scenes. No assets to load, so the demo starts instantly. */
const SCENES: {
  label: string;
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
}[] = [
  {
    label: "Golden hour",
    paint: (ctx, w, h, t) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#FFB35C");
      g.addColorStop(0.55, "#E4632A");
      g.addColorStop(1, "#4A1E3C");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#FFF3E0";
      ctx.beginPath();
      ctx.arc(w * 0.72, h * 0.3 + Math.sin(t) * 8, w * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#2A0E1E";
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.72);
      ctx.lineTo(w * 0.34, h * 0.83);
      ctx.lineTo(w * 0.62, h * 0.66);
      ctx.lineTo(w, h * 0.79);
      ctx.lineTo(w, h);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
  },
  {
    label: "Deep field",
    paint: (ctx, w, h, t) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0B1830");
      g.addColorStop(1, "#04070F");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // A deterministic star field, so it does not flicker between frames.
      for (let i = 0; i < 90; i++) {
        const x = ((i * 73.31) % 1) * w;
        const y = ((i * 41.17) % 1) * h;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.3 + i));
        ctx.globalAlpha = tw * 0.9;
        ctx.fillStyle = i % 7 === 0 ? "#9BD6FF" : "#FFFFFF";
        ctx.fillRect(x, y, 1.6, 1.6);
      }
      ctx.globalAlpha = 1;
      const halo = ctx.createRadialGradient(w * 0.3, h * 0.62, 0, w * 0.3, h * 0.62, w * 0.4);
      halo.addColorStop(0, "rgba(77,140,255,0.35)");
      halo.addColorStop(1, "rgba(77,140,255,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);
    },
  },
  {
    label: "Neon grid",
    paint: (ctx, w, h, t) => {
      ctx.fillStyle = "#120A1E";
      ctx.fillRect(0, 0, w, h);
      const horizon = h * 0.52;
      ctx.strokeStyle = "rgba(255,45,149,0.55)";
      ctx.lineWidth = 1.2;
      for (let i = 0; i <= 14; i++) {
        const x = (i / 14) * w;
        ctx.beginPath();
        ctx.moveTo(x, horizon);
        ctx.lineTo(w / 2 + (x - w / 2) * 4, h);
        ctx.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const p = ((i + (t * 0.4) % 1) / 12) ** 2.2;
        const y = horizon + p * (h - horizon);
        ctx.globalAlpha = 0.25 + p * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const sun = ctx.createLinearGradient(0, horizon - w * 0.16, 0, horizon);
      sun.addColorStop(0, "#FFD23F");
      sun.addColorStop(1, "#FF2D95");
      ctx.fillStyle = sun;
      ctx.beginPath();
      ctx.arc(w / 2, horizon, w * 0.14, Math.PI, 0);
      ctx.fill();
    },
  },
  {
    label: "Paper",
    paint: (ctx, w, h) => {
      ctx.fillStyle = "#F2EDE4";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#1A1815";
      ctx.fillRect(w * 0.1, h * 0.22, w * 0.44, h * 0.055);
      ctx.fillStyle = "#C0543C";
      ctx.fillRect(w * 0.1, h * 0.34, w * 0.28, h * 0.03);
      ctx.fillStyle = "#8A857C";
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(w * 0.1, h * (0.46 + i * 0.06), w * (0.6 - i * 0.06), h * 0.016);
      }
      ctx.strokeStyle = "#1A1815";
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.06, h * 0.12, w * 0.88, h * 0.76);
    },
  },
];

const DEMO: TransitionKind[] = [
  "dissolve",
  "circle-open",
  "push-left",
  "whip-pan",
  "glitch",
  "zoom-blur",
  "wipe-right",
  "dip-to-black",
];

export function TransitionShowcase({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState<TransitionKind>("dissolve");
  const [paused, setPaused] = useState(false);
  const activeRef = useRef(active);
  const pausedRef = useRef(paused);
  activeRef.current = active;
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!scratchRef.current) scratchRef.current = document.createElement("canvas");
    const scratch = scratchRef.current;

    const W = 640;
    const H = 360;
    canvas.width = W;
    canvas.height = H;
    scratch.width = W;
    scratch.height = H;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let raf = 0;
    const started = performance.now();
    // Each cycle: hold one scene, then run the transition into the next.
    const HOLD = 1.5;
    const RUN = 1.1;
    const CYCLE = HOLD + RUN;

    const loop = (now: number) => {
      const t = (now - started) / 1000;
      const cycle = Math.floor(t / CYCLE);
      const local = t % CYCLE;
      const from = SCENES[cycle % SCENES.length];
      const to = SCENES[(cycle + 1) % SCENES.length];

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.filter = "none";

      if (pausedRef.current || local < HOLD) {
        from.paint(ctx, W, H, t);
      } else {
        const p = (local - HOLD) / RUN;
        renderTransition(
          ctx,
          scratch,
          activeRef.current,
          p,
          W,
          H,
          (c) => from.paint(c, W, H, t),
          (c) => to.paint(c, W, H, t)
        );
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative overflow-hidden rounded-xl border border-ink-700 bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
        <canvas ref={canvasRef} className="block aspect-video w-full" />
        <div className="pointer-events-none absolute left-3 top-3 rounded bg-black/60 px-2 py-1 font-mono text-[10px] tracking-wide text-white/80 backdrop-blur">
          rendering live · canvas
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {DEMO.map((k) => (
          <button
            key={k}
            onClick={() => setActive(k)}
            onMouseEnter={() => setPaused(false)}
            className={cn(
              "rounded-md border px-2.5 py-1.5 text-[11px] transition",
              active === k
                ? "border-blade-400 bg-blade-500/12 text-blade-200"
                : "border-ink-700 text-ink-400 hover:border-ink-500 hover:text-ink-200"
            )}
          >
            {k.replace(/-/g, " ")}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-500">
        Pick one — the canvas above swaps to it on the next cut. This is the same code that runs
        inside the editor and writes the exported file.
      </p>
    </div>
  );
}
