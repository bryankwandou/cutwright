import { AnimationSpec, ClipAnimation } from "./types";

export const ENTER_ANIMATIONS: { id: ClipAnimation; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fade-in", label: "Fade" },
  { id: "slide-up", label: "Slide up" },
  { id: "slide-down", label: "Slide down" },
  { id: "slide-left", label: "Slide left" },
  { id: "slide-right", label: "Slide right" },
  { id: "pop", label: "Pop" },
  { id: "zoom-in", label: "Zoom in" },
  { id: "zoom-out", label: "Zoom out" },
  { id: "typewriter", label: "Typewriter" },
  { id: "wipe-reveal", label: "Wipe reveal" },
  { id: "bounce", label: "Bounce" },
  { id: "shake", label: "Shake" },
  { id: "spin-in", label: "Spin" },
];

export const EXIT_ANIMATIONS: { id: ClipAnimation; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fade-out", label: "Fade" },
  { id: "slide-up", label: "Slide up" },
  { id: "slide-down", label: "Slide down" },
  { id: "slide-left", label: "Slide left" },
  { id: "slide-right", label: "Slide right" },
  { id: "zoom-in", label: "Zoom in" },
  { id: "zoom-out", label: "Zoom out" },
  { id: "pop", label: "Pop" },
  { id: "spin-in", label: "Spin" },
];

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInCubic = (t: number) => t * t * t;
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutBounce = (t: number) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

/** Per-frame animation output, applied on top of the clip's own transform. */
export interface AnimationOffset {
  opacity: number;
  dx: number;
  dy: number;
  scale: number;
  rotation: number;
  /** 0..1 fraction of the text that should be visible (typewriter). */
  reveal: number;
  /** 0..1 horizontal wipe mask. 1 means fully revealed. */
  wipe: number;
}

const neutral = (): AnimationOffset => ({
  opacity: 1,
  dx: 0,
  dy: 0,
  scale: 1,
  rotation: 0,
  reveal: 1,
  wipe: 1,
});

/**
 * `p` runs 0 -> 1 across the animation window. For entrances it is progress
 * into the clip; for exits we pass the remaining fraction, so both directions
 * share the same curve definitions.
 */
function applyCurve(kind: ClipAnimation, p: number, out: AnimationOffset) {
  const e = easeOutCubic(p);
  switch (kind) {
    case "fade-in":
    case "fade-out":
      out.opacity *= p;
      break;
    case "slide-up":
      out.dy += (1 - e) * 0.25;
      out.opacity *= Math.min(1, p * 1.6);
      break;
    case "slide-down":
      out.dy -= (1 - e) * 0.25;
      out.opacity *= Math.min(1, p * 1.6);
      break;
    case "slide-left":
      out.dx += (1 - e) * 0.3;
      out.opacity *= Math.min(1, p * 1.6);
      break;
    case "slide-right":
      out.dx -= (1 - e) * 0.3;
      out.opacity *= Math.min(1, p * 1.6);
      break;
    case "pop":
      out.scale *= 0.6 + 0.4 * easeOutBack(p);
      out.opacity *= Math.min(1, p * 2);
      break;
    case "zoom-in":
      out.scale *= 0.75 + 0.25 * e;
      out.opacity *= Math.min(1, p * 1.5);
      break;
    case "zoom-out":
      out.scale *= 1.3 - 0.3 * e;
      out.opacity *= Math.min(1, p * 1.5);
      break;
    case "typewriter":
      out.reveal = p;
      break;
    case "wipe-reveal":
      out.wipe = e;
      break;
    case "bounce":
      out.dy += (1 - easeOutBounce(p)) * 0.3;
      out.opacity *= Math.min(1, p * 3);
      break;
    case "shake":
      // Decaying oscillation, so it settles rather than cutting off abruptly.
      out.dx += Math.sin(p * Math.PI * 8) * 0.04 * (1 - p);
      out.opacity *= Math.min(1, p * 3);
      break;
    case "spin-in":
      out.rotation += (1 - e) * 180;
      out.scale *= 0.5 + 0.5 * e;
      out.opacity *= Math.min(1, p * 2);
      break;
    default:
      break;
  }
}

/** Computes the combined entrance/exit offset for a clip at local time `t`. */
export function animationAt(spec: AnimationSpec, t: number, clipDuration: number): AnimationOffset {
  const out = neutral();

  if (spec.enter !== "none" && spec.enterDuration > 0 && t < spec.enterDuration) {
    applyCurve(spec.enter, Math.max(0, Math.min(1, t / spec.enterDuration)), out);
  }

  if (spec.exit !== "none" && spec.exitDuration > 0) {
    const remaining = clipDuration - t;
    if (remaining < spec.exitDuration) {
      const p = Math.max(0, Math.min(1, remaining / spec.exitDuration));
      // Exits reuse the entrance curves in reverse, so `p` counts back to 0.
      applyCurve(spec.exit, p, out);
    }
  }

  out.opacity = Math.max(0, Math.min(1, out.opacity));
  return out;
}

export { easeInCubic, easeOutCubic };
