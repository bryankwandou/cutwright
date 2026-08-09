import { animationAt, AnimationOffset } from "./animations";
import { gradeToCssFilter, resolveGrade, findPreset } from "./filters";
import { renderTransition } from "./transitions";
import {
  Clip,
  ProjectSettings,
  TextClip,
  Track,
  isMediaClip,
  isShapeClip,
  isTextClip,
} from "./types";

/**
 * Supplies decoded pixels for a media clip. The preview implementation returns
 * live <video> elements; the export implementation returns frames seeked to an
 * exact timestamp. Keeping this behind an interface means the compositor is the
 * single source of truth for how a frame looks in both paths.
 */
export interface FrameProvider {
  get(assetId: string, sourceTime: number): CanvasImageSource | null;
  /** Natural pixel dimensions of the source, used for cover-fit maths. */
  size(assetId: string): { width: number; height: number } | null;
}

const PAINT_ORDER: Record<Track["kind"], number> = { video: 0, overlay: 1, text: 2, audio: -1 };

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  scratch: HTMLCanvasElement | OffscreenCanvas;
  settings: ProjectSettings;
  tracks: Track[];
  clips: Clip[];
  provider: FrameProvider;
  /** Draws selection handles etc. Skipped during export. */
  overlayHook?: (ctx: CanvasRenderingContext2D) => void;
}

/** Scales a source to cover the frame, preserving aspect ratio (no letterbox). */
function coverRect(sw: number, sh: number, dw: number, dh: number) {
  const scale = Math.max(dw / sw, dh / sh);
  const w = sw * scale;
  const h = sh * scale;
  return { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
}

function applyVignette(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  if (amount <= 0) return;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${Math.min(1, amount)})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function roundedClip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.clip();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(" ");
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    out.push(line);
  }
  return out;
}

function drawTextClip(
  ctx: CanvasRenderingContext2D,
  clip: TextClip,
  anim: AnimationOffset,
  W: number,
  H: number
) {
  const s = clip.style;
  const raw = s.uppercase ? clip.text.toUpperCase() : clip.text;
  // Typewriter reveals characters rather than fading the whole block.
  const shown = anim.reveal >= 1 ? raw : raw.slice(0, Math.ceil(raw.length * anim.reveal));

  ctx.font = `${s.fontWeight} ${s.fontSize}px ${s.fontFamily}, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = s.align;
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${s.letterSpacing}px`;
  }

  const lines = wrapLines(ctx, shown, W * 0.86);
  const lineH = s.fontSize * s.lineHeight;
  const blockH = lines.length * lineH;
  const anchorX = s.align === "left" ? -W * 0.43 : s.align === "right" ? W * 0.43 : 0;

  if (s.backgroundColor && s.backgroundColor !== "transparent") {
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
    const pad = s.backgroundPadding;
    ctx.save();
    ctx.fillStyle = s.backgroundColor;
    const bx = s.align === "left" ? anchorX : s.align === "right" ? anchorX - widest : -widest / 2;
    ctx.fillRect(bx - pad, -blockH / 2 - pad, widest + pad * 2, blockH + pad * 2);
    ctx.restore();
  }

  if (s.shadowBlur > 0 || s.shadowOffsetY !== 0) {
    ctx.shadowColor = s.shadowColor;
    ctx.shadowBlur = s.shadowBlur;
    ctx.shadowOffsetY = s.shadowOffsetY;
  }

  lines.forEach((line, i) => {
    const y = -blockH / 2 + lineH * (i + 0.5);
    if (s.strokeWidth > 0) {
      ctx.lineWidth = s.strokeWidth * 2;
      ctx.strokeStyle = s.strokeColor;
      ctx.lineJoin = "round";
      ctx.strokeText(line, anchorX, y);
    }
    ctx.fillStyle = s.color;
    ctx.fillText(line, anchorX, y);
  });
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/** Paints a single clip at local time `local`, in isolation. */
function paintClip(
  rc: RenderContext,
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  local: number
) {
  const { settings, provider } = rc;
  const W = settings.width;
  const H = settings.height;

  const anim = animationAt(clip.animation, local, clip.duration);
  const tr = clip.transform;
  const opacity = tr.opacity * anim.opacity;
  if (opacity <= 0.001) return;

  const grade = resolveGrade(clip.grade, clip.lut);
  const preset = findPreset(clip.lut);

  ctx.save();
  // Multiply rather than assign: a transition may already have dimmed the
  // context before handing it to us, and overwriting would cancel the blend.
  const inherited = ctx.globalAlpha;
  ctx.globalAlpha = inherited * opacity;

  // A wipe-reveal masks the clip before any transform is applied.
  if (anim.wipe < 1) {
    ctx.beginPath();
    ctx.rect(0, 0, W * anim.wipe, H);
    ctx.clip();
  }

  ctx.translate(W / 2 + (tr.x + anim.dx) * W, H / 2 + (tr.y + anim.dy) * H);
  ctx.rotate(((tr.rotation + anim.rotation) * Math.PI) / 180);
  const scale = tr.scale * anim.scale;
  ctx.scale(scale * (tr.flipX ? -1 : 1), scale * (tr.flipY ? -1 : 1));

  if (isMediaClip(clip) && clip.type !== "audio") {
    const sourceTime = clip.trimIn + local * clip.speed;
    const img = provider.get(clip.assetId, sourceTime);
    const size = provider.size(clip.assetId);
    if (img && size) {
      const r = coverRect(size.width, size.height, W, H);
      ctx.save();
      if (tr.radius > 0) roundedClip(ctx, -W / 2, -H / 2, W, H, tr.radius);
      ctx.filter = gradeToCssFilter(grade);
      try {
        ctx.drawImage(img, r.x - W / 2, r.y - H / 2, r.w, r.h);
      } catch {
        // A video element that has not produced a frame yet throws; skipping
        // this clip for one frame is better than aborting the whole render.
      }
      ctx.filter = "none";
      if (preset?.tint) {
        ctx.globalCompositeOperation = preset.tint.blend;
        ctx.globalAlpha = inherited * opacity * preset.tint.alpha;
        ctx.fillStyle = preset.tint.color;
        ctx.fillRect(-W / 2, -H / 2, W, H);
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = inherited * opacity;
      }
      applyVignette(ctx, W, H, grade.vignette);
      ctx.restore();
    }
  } else if (isTextClip(clip)) {
    drawTextClip(ctx, clip, anim, W, H);
  } else if (isShapeClip(clip)) {
    ctx.fillStyle = clip.fill;
    const w = clip.width;
    const h = clip.height;
    if (clip.shape === "rect") {
      ctx.save();
      if (tr.radius > 0) roundedClip(ctx, -w / 2, -h / 2, w, h, tr.radius);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    } else if (clip.shape === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(-w / 2, -h / 8, w, h / 4);
    }
  }

  ctx.restore();
}

/** True when `time` sits inside the transition window at the head of `clip`. */
function transitionWindow(clip: Clip) {
  const d = clip.transitionIn.duration;
  return { start: clip.start - d / 2, end: clip.start + d / 2, duration: d };
}

export function renderFrame(rc: RenderContext, time: number) {
  const { ctx, settings, tracks, clips, scratch } = rc;
  const W = settings.width;
  const H = settings.height;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.filter = "none";
  ctx.fillStyle = settings.background;
  ctx.fillRect(0, 0, W, H);

  const visualTracks = tracks
    .filter((t) => t.kind !== "audio" && !t.hidden)
    .sort((a, b) => PAINT_ORDER[a.kind] - PAINT_ORDER[b.kind]);

  for (const track of visualTracks) {
    const onTrack = clips
      .filter((c) => c.trackId === track.id && c.type !== "audio")
      .sort((a, b) => a.start - b.start);

    for (let i = 0; i < onTrack.length; i++) {
      const clip = onTrack[i];
      const prev = onTrack[i - 1];
      const win = transitionWindow(clip);
      const hasTransition =
        clip.transitionIn.kind !== "none" &&
        win.duration > 0 &&
        prev !== undefined &&
        // Only blend when the previous clip actually reaches the cut point.
        Math.abs(prev.start + prev.duration - clip.start) < 0.05;

      if (hasTransition && time >= win.start && time < win.end) {
        const p = (time - win.start) / win.duration;
        renderTransition(
          ctx,
          scratch,
          clip.transitionIn.kind,
          p,
          W,
          H,
          (c) => paintClip(rc, c, prev, Math.min(prev.duration, time - prev.start)),
          (c) => paintClip(rc, c, clip, Math.max(0, time - clip.start))
        );
        continue;
      }

      // Outside a transition, paint normally when the playhead is inside the
      // clip — but skip the tail that the next clip's transition already owns.
      const next = onTrack[i + 1];
      const tailOwnedByNext =
        next &&
        next.transitionIn.kind !== "none" &&
        Math.abs(clip.start + clip.duration - next.start) < 0.05 &&
        time >= transitionWindow(next).start;
      if (tailOwnedByNext) continue;
      if (time >= clip.start && time < clip.start + clip.duration) {
        if (time < win.end && hasTransition) continue;
        paintClip(rc, ctx, clip, time - clip.start);
      }
    }
  }

  rc.overlayHook?.(ctx);
}
