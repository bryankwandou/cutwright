import { TransitionKind } from "./types";
import { easeOutCubic } from "./animations";

export const TRANSITIONS: { id: TransitionKind; label: string; group: string }[] = [
  { id: "none", label: "None", group: "Basic" },
  { id: "dissolve", label: "Dissolve", group: "Basic" },
  { id: "dip-to-black", label: "Dip to black", group: "Basic" },
  { id: "dip-to-white", label: "Dip to white", group: "Basic" },
  { id: "slide-left", label: "Slide left", group: "Motion" },
  { id: "slide-right", label: "Slide right", group: "Motion" },
  { id: "slide-up", label: "Slide up", group: "Motion" },
  { id: "slide-down", label: "Slide down", group: "Motion" },
  { id: "push-left", label: "Push", group: "Motion" },
  { id: "whip-pan", label: "Whip pan", group: "Motion" },
  { id: "wipe-left", label: "Wipe left", group: "Wipe" },
  { id: "wipe-right", label: "Wipe right", group: "Wipe" },
  { id: "circle-open", label: "Circle open", group: "Wipe" },
  { id: "zoom-blur", label: "Zoom blur", group: "Stylised" },
  { id: "glitch", label: "Glitch", group: "Stylised" },
];

export type DrawLayer = (ctx: CanvasRenderingContext2D) => void;

/**
 * Composites the outgoing clip (`from`) into the incoming clip (`to`) at
 * progress `p` (0 -> 1). Both layers are supplied as draw callbacks so the
 * compositor keeps ownership of how each clip is actually painted.
 *
 * `scratch` is a reusable offscreen canvas — transitions that need to transform
 * a fully-rendered layer draw into it first rather than allocating per frame.
 */
export function renderTransition(
  ctx: CanvasRenderingContext2D,
  scratch: HTMLCanvasElement | OffscreenCanvas,
  kind: TransitionKind,
  p: number,
  w: number,
  h: number,
  from: DrawLayer,
  to: DrawLayer
) {
  const t = Math.max(0, Math.min(1, p));
  const e = easeOutCubic(t);
  const sctx = scratch.getContext("2d") as CanvasRenderingContext2D;

  const intoScratch = (layer: DrawLayer) => {
    sctx.save();
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, w, h);
    layer(sctx);
    sctx.restore();
  };

  switch (kind) {
    case "dissolve": {
      from(ctx);
      ctx.save();
      ctx.globalAlpha = t;
      to(ctx);
      ctx.restore();
      return;
    }

    case "dip-to-black":
    case "dip-to-white": {
      const colour = kind === "dip-to-black" ? "#000000" : "#FFFFFF";
      if (t < 0.5) {
        from(ctx);
        ctx.save();
        ctx.globalAlpha = t * 2;
        ctx.fillStyle = colour;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      } else {
        to(ctx);
        ctx.save();
        ctx.globalAlpha = (1 - t) * 2;
        ctx.fillStyle = colour;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
      return;
    }

    case "slide-left":
    case "slide-right":
    case "slide-up":
    case "slide-down": {
      from(ctx);
      const dist = kind === "slide-left" || kind === "slide-right" ? w : h;
      const sign = kind === "slide-left" || kind === "slide-up" ? 1 : -1;
      const off = (1 - e) * dist * sign;
      intoScratch(to);
      ctx.save();
      if (kind === "slide-left" || kind === "slide-right") ctx.translate(off, 0);
      else ctx.translate(0, off);
      ctx.drawImage(scratch as CanvasImageSource, 0, 0);
      ctx.restore();
      return;
    }

    case "push-left": {
      intoScratch(from);
      ctx.save();
      ctx.translate(-e * w, 0);
      ctx.drawImage(scratch as CanvasImageSource, 0, 0);
      ctx.restore();
      intoScratch(to);
      ctx.save();
      ctx.translate((1 - e) * w, 0);
      ctx.drawImage(scratch as CanvasImageSource, 0, 0);
      ctx.restore();
      return;
    }

    case "whip-pan": {
      // Blur peaks mid-transition, which is what sells the motion.
      const blur = Math.sin(t * Math.PI) * 24;
      intoScratch(from);
      ctx.save();
      ctx.filter = `blur(${blur}px)`;
      ctx.translate(-e * w * 1.1, 0);
      ctx.drawImage(scratch as CanvasImageSource, 0, 0);
      ctx.restore();
      intoScratch(to);
      ctx.save();
      ctx.filter = `blur(${blur}px)`;
      ctx.translate((1 - e) * w * 1.1, 0);
      ctx.drawImage(scratch as CanvasImageSource, 0, 0);
      ctx.restore();
      return;
    }

    case "wipe-left":
    case "wipe-right": {
      from(ctx);
      intoScratch(to);
      ctx.save();
      ctx.beginPath();
      if (kind === "wipe-left") ctx.rect(w - e * w, 0, e * w, h);
      else ctx.rect(0, 0, e * w, h);
      ctx.clip();
      ctx.drawImage(scratch as CanvasImageSource, 0, 0);
      ctx.restore();
      return;
    }

    case "circle-open": {
      from(ctx);
      intoScratch(to);
      const maxR = Math.hypot(w, h) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, e * maxR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(scratch as CanvasImageSource, 0, 0);
      ctx.restore();
      return;
    }

    case "zoom-blur": {
      intoScratch(from);
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.filter = `blur(${t * 18}px)`;
      const s1 = 1 + e * 0.5;
      ctx.translate(w / 2, h / 2);
      ctx.scale(s1, s1);
      ctx.drawImage(scratch as CanvasImageSource, -w / 2, -h / 2);
      ctx.restore();

      intoScratch(to);
      ctx.save();
      ctx.globalAlpha = t;
      ctx.filter = `blur(${(1 - t) * 18}px)`;
      const s2 = 1.5 - e * 0.5;
      ctx.translate(w / 2, h / 2);
      ctx.scale(s2, s2);
      ctx.drawImage(scratch as CanvasImageSource, -w / 2, -h / 2);
      ctx.restore();
      return;
    }

    case "glitch": {
      const base = t < 0.5 ? from : to;
      const other = t < 0.5 ? to : from;
      intoScratch(base);
      ctx.drawImage(scratch as CanvasImageSource, 0, 0);

      // Horizontal slices torn sideways, strongest at the midpoint.
      const intensity = Math.sin(t * Math.PI);
      const slices = 14;
      intoScratch(other);
      for (let i = 0; i < slices; i++) {
        if (Math.random() > intensity) continue;
        const sy = (i / slices) * h;
        const sh = h / slices;
        const dx = (Math.random() - 0.5) * w * 0.25 * intensity;
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.drawImage(scratch as CanvasImageSource, 0, sy, w, sh, dx, sy, w, sh);
        ctx.restore();
      }
      // Chromatic fringing on the RGB channels.
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = intensity * 0.25;
      ctx.fillStyle = "#FF0040";
      ctx.fillRect(-intensity * 8, 0, w, h);
      ctx.fillStyle = "#00FFEA";
      ctx.fillRect(intensity * 8, 0, w, h);
      ctx.restore();
      return;
    }

    default: {
      // `none` is a hard cut at the midpoint.
      if (t < 0.5) from(ctx);
      else to(ctx);
    }
  }
}
