"use client";

import { useEffect, useRef, useState } from "react";
import { FILTER_PRESETS, gradeToCssFilter, resolveGrade } from "@/lib/filters";
import { defaultGrade } from "@/lib/types";
import { cn } from "@/lib/cn";

const SHOWN = [
  "none",
  "film",
  "teal-orange",
  "noir",
  "golden",
  "cyberpunk",
  "vintage",
  "bleach",
  "dream",
  "arctic",
  "neon",
  "faded",
];

/**
 * Paints a reference scene once, then re-grades it through the same code path
 * the editor uses. Clicking a swatch changes the big canvas immediately.
 */
function paintScene(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, "#2E5C8A");
  sky.addColorStop(0.6, "#D98E5A");
  sky.addColorStop(1, "#F0C48A");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#FFF6DC";
  ctx.beginPath();
  ctx.arc(w * 0.68, h * 0.44, w * 0.055, 0, Math.PI * 2);
  ctx.fill();

  // Layered ridges, back to front, each a little darker.
  const ridges = [
    { y: 0.56, c: "#7A5E7A", amp: 0.05 },
    { y: 0.66, c: "#4E3F60", amp: 0.07 },
    { y: 0.76, c: "#2C2440", amp: 0.05 },
  ];
  for (const r of ridges) {
    ctx.fillStyle = r.c;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * r.y);
    for (let x = 0; x <= w; x += w / 40) {
      const n = Math.sin(x * 0.012 + r.y * 20) * 0.5 + Math.sin(x * 0.031 + r.y * 9) * 0.5;
      ctx.lineTo(x, h * (r.y + n * r.amp));
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  // Water, with a reflection band.
  ctx.fillStyle = "#17182B";
  ctx.fillRect(0, h * 0.82, w, h * 0.18);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#F0C48A";
  for (let i = 0; i < 12; i++) {
    ctx.fillRect(w * 0.6 + Math.sin(i) * 14, h * (0.83 + i * 0.013), w * 0.16, 1.6);
  }
  ctx.globalAlpha = 1;
}

export function FilterLab() {
  const bigRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState("film");

  useEffect(() => {
    if (!sceneRef.current) {
      const c = document.createElement("canvas");
      c.width = 720;
      c.height = 405;
      const sctx = c.getContext("2d");
      if (sctx) paintScene(sctx, c.width, c.height);
      sceneRef.current = c;
    }

    const canvas = bigRef.current;
    const scene = sceneRef.current;
    if (!canvas || !scene) return;
    canvas.width = scene.width;
    canvas.height = scene.height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const preset = FILTER_PRESETS.find((p) => p.id === active);
    const grade = resolveGrade(defaultGrade(), active);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.filter = gradeToCssFilter(grade);
    ctx.drawImage(scene, 0, 0);
    ctx.filter = "none";

    if (preset?.tint) {
      ctx.globalCompositeOperation = preset.tint.blend;
      ctx.globalAlpha = preset.tint.alpha;
      ctx.fillStyle = preset.tint.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }

    if (grade.vignette > 0) {
      const g = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        Math.min(canvas.width, canvas.height) * 0.3,
        canvas.width / 2,
        canvas.height / 2,
        Math.max(canvas.width, canvas.height) * 0.75
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${grade.vignette})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [active]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] lg:items-start">
      <div className="overflow-hidden rounded-xl border border-ink-700 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
        <canvas ref={bigRef} className="block aspect-video w-full" />
      </div>

      <div>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-4">
          {SHOWN.map((id) => {
            const preset = FILTER_PRESETS.find((p) => p.id === id);
            if (!preset) return null;
            const g = { ...defaultGrade(), ...preset.grade };
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={cn(
                  "group overflow-hidden rounded-lg border transition",
                  active === id
                    ? "border-blade-400 ring-1 ring-blade-400/40"
                    : "border-ink-700 hover:border-ink-500"
                )}
              >
                <span className="relative block aspect-[4/3]">
                  <span
                    className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.06]"
                    style={{
                      filter: gradeToCssFilter(g),
                      background:
                        "linear-gradient(160deg,#2E5C8A 0%,#D98E5A 42%,#7A5E7A 68%,#17182B 100%)",
                    }}
                  />
                  {preset.tint && (
                    <span
                      className="absolute inset-0"
                      style={{
                        background: preset.tint.color,
                        opacity: preset.tint.alpha,
                        mixBlendMode: preset.tint.blend as React.CSSProperties["mixBlendMode"],
                      }}
                    />
                  )}
                </span>
                <span
                  className={cn(
                    "block truncate px-1 py-1 text-[9px]",
                    active === id ? "text-blade-200" : "text-ink-400"
                  )}
                >
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-400">
          Twenty-six looks ship with the editor, and each one is a plain set of numbers rather than a
          baked image. Stack a manual grade on top and the export reproduces it exactly.
        </p>
      </div>
    </div>
  );
}
