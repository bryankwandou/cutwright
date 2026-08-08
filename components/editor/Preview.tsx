"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { useEditor } from "@/lib/store";
import { FrameProvider, renderFrame } from "@/lib/compositor";
import { formatTime } from "@/lib/media";
import { Clip, isMediaClip } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * Keeps one media element per asset. Video elements are the fastest reliable
 * way to drive a live preview — the decoder stays warm and the browser handles
 * A/V sync for us. Export uses a different, frame-exact path.
 */
function useMediaPool() {
  const assets = useEditor((s) => s.assets);
  const pool = useRef(new Map<string, HTMLVideoElement | HTMLImageElement>());

  useEffect(() => {
    const map = pool.current;
    for (const asset of assets) {
      if (map.has(asset.id)) continue;
      if (asset.kind === "image") {
        const img = new Image();
        img.src = asset.url;
        map.set(asset.id, img);
      } else {
        const el = document.createElement("video");
        el.src = asset.url;
        el.preload = "auto";
        el.playsInline = true;
        el.muted = asset.kind === "video" ? false : false;
        el.crossOrigin = "anonymous";
        map.set(asset.id, el);
      }
    }
    // Drop elements for assets that were removed, so decoders are released.
    for (const [id, el] of map) {
      if (!assets.some((a) => a.id === id)) {
        if (el instanceof HTMLVideoElement) {
          el.pause();
          el.removeAttribute("src");
          el.load();
        }
        map.delete(id);
      }
    }
  }, [assets]);

  return pool;
}

export function Preview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);

  const [muted, setMuted] = useState(false);
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });

  const settings = useEditor((s) => s.settings);
  const clips = useEditor((s) => s.clips);
  const tracks = useEditor((s) => s.tracks);
  const playing = useEditor((s) => s.playing);
  const playhead = useEditor((s) => s.playhead);
  const setPlayhead = useEditor((s) => s.setPlayhead);
  const setPlaying = useEditor((s) => s.setPlaying);
  const duration = useEditor((s) => s.duration());

  const pool = useMediaPool();

  if (!scratchRef.current && typeof document !== "undefined") {
    scratchRef.current = document.createElement("canvas");
  }

  const provider = useMemo<FrameProvider>(
    () => ({
      get: (assetId) => {
        const el = pool.current.get(assetId);
        if (!el) return null;
        if (el instanceof HTMLVideoElement) return el.readyState >= 2 ? el : null;
        return el.complete ? el : null;
      },
      size: (assetId) => {
        const el = pool.current.get(assetId);
        if (!el) return null;
        if (el instanceof HTMLVideoElement) {
          return el.videoWidth ? { width: el.videoWidth, height: el.videoHeight } : null;
        }
        return el.naturalWidth ? { width: el.naturalWidth, height: el.naturalHeight } : null;
      },
    }),
    [pool]
  );

  /** Brings every media element in line with the playhead. */
  const syncMedia = useCallback(
    (time: number, isPlaying: boolean) => {
      const active = new Set<string>();

      for (const clip of clips) {
        if (!isMediaClip(clip) || clip.type === "image") continue;
        const inside = time >= clip.start - 0.15 && time < clip.start + clip.duration;
        const el = pool.current.get(clip.assetId);
        if (!el || !(el instanceof HTMLVideoElement)) continue;
        if (!inside) continue;

        active.add(clip.assetId);
        const track = tracks.find((t) => t.id === clip.trackId);
        const want = clip.trimIn + Math.max(0, time - clip.start) * clip.speed;

        el.playbackRate = Math.max(0.0625, Math.min(16, clip.speed));
        el.volume = muted || track?.muted ? 0 : Math.max(0, Math.min(1, clip.volume));

        // A generous window while playing avoids constant re-seeking, which
        // would stutter; scrubbing gets a tight one so frames land exactly.
        const tolerance = isPlaying ? 0.32 : 0.035;
        if (Math.abs(el.currentTime - want) > tolerance && Number.isFinite(want)) {
          el.currentTime = Math.max(0, want);
        }
        if (isPlaying && el.paused) void el.play().catch(() => undefined);
        if (!isPlaying && !el.paused) el.pause();
      }

      for (const [id, el] of pool.current) {
        if (el instanceof HTMLVideoElement && !active.has(id) && !el.paused) el.pause();
      }
    },
    [clips, tracks, muted, pool]
  );

  const draw = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      const scratch = scratchRef.current;
      if (!canvas || !scratch) return;
      if (canvas.width !== settings.width || canvas.height !== settings.height) {
        canvas.width = settings.width;
        canvas.height = settings.height;
        scratch.width = settings.width;
        scratch.height = settings.height;
      }
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;
      renderFrame({ ctx, scratch, settings, tracks, clips, provider }, time);
    },
    [settings, tracks, clips, provider]
  );

  // The playback loop. Real elapsed time drives the playhead so playback keeps
  // wall-clock pace even when a frame takes longer than its slot to render.
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      syncMedia(useEditor.getState().playhead, false);
      draw(useEditor.getState().playhead);
      return;
    }

    lastTickRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      const state = useEditor.getState();
      const next = state.playhead + dt;
      const end = state.duration();

      if (next >= end) {
        state.setPlayhead(end);
        state.setPlaying(false);
        syncMedia(end, false);
        draw(end);
        return;
      }

      state.setPlayhead(next);
      syncMedia(next, true);
      draw(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, syncMedia, draw]);

  // Redraw on any edit or scrub while paused.
  useEffect(() => {
    if (playing) return;
    syncMedia(playhead, false);
    const id = requestAnimationFrame(() => draw(playhead));
    return () => cancelAnimationFrame(id);
  }, [playhead, playing, draw, syncMedia]);

  // Fit the canvas inside its container without distorting the frame.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const pad = 32;
      const availW = rect.width - pad;
      const availH = rect.height - pad;
      const ar = settings.width / settings.height;
      let w = availW;
      let h = w / ar;
      if (h > availH) {
        h = availH;
        w = h * ar;
      }
      setBoxSize({ w: Math.max(0, w), h: Math.max(0, h) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [settings.width, settings.height]);

  const step = (frames: number) => {
    setPlaying(false);
    setPlayhead(Math.max(0, Math.min(duration, playhead + frames / settings.fps)));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={wrapRef} className="relative flex min-h-0 flex-1 items-center justify-center p-4">
        <div
          className="relative overflow-hidden rounded-lg bg-black shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)] ring-1 ring-ink-700"
          style={{ width: boxSize.w || undefined, height: boxSize.h || undefined }}
        >
          <canvas ref={canvasRef} className="block h-full w-full" />
          {clips.length === 0 && <EmptyStage />}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-ink-700 bg-ink-900 px-4 py-2.5">
        <button
          onClick={() => setPlaying(!playing)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-50 text-ink-950 transition hover:bg-white active:scale-95"
          aria-label={playing ? "Pause" : "Play"}
          title={playing ? "Pause (Space)" : "Play (Space)"}
        >
          {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
        </button>

        <IconButton onClick={() => step(-1)} label="Previous frame" title="Previous frame (←)">
          <SkipBack size={15} />
        </IconButton>
        <IconButton onClick={() => step(1)} label="Next frame" title="Next frame (→)">
          <SkipForward size={15} />
        </IconButton>

        <div className="ml-1 font-mono text-xs tabular-nums text-ink-300">
          <span className="text-ink-50">{formatTime(playhead, true, settings.fps)}</span>
          <span className="mx-1.5 text-ink-600">/</span>
          {formatTime(duration, true, settings.fps)}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <IconButton onClick={() => setMuted(!muted)} label="Mute" title={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </IconButton>
          <span className="rounded bg-ink-800 px-2 py-1 font-mono text-[10px] text-ink-300">
            {settings.width}×{settings.height}
          </span>
          <IconButton
            onClick={() => canvasRef.current?.requestFullscreen?.()}
            label="Fullscreen"
            title="Fullscreen"
          >
            <Maximize2 size={15} />
          </IconButton>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={title ?? label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-ink-300",
        "transition hover:bg-ink-750 hover:text-ink-50 active:scale-95"
      )}
    >
      {children}
    </button>
  );
}

function EmptyStage() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center">
      <div className="text-center">
        <p className="text-sm font-medium text-ink-300">Nothing on the timeline yet</p>
        <p className="mt-1 text-xs text-ink-500">Drop a file, or use Import in the left panel</p>
      </div>
    </div>
  );
}
