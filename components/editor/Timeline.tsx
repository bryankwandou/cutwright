"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Lock,
  Magnet,
  Music,
  Plus,
  Redo2,
  Scissors,
  Square,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Video as VideoIcon,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { snapTime, useEditor } from "@/lib/store";
import { formatTime } from "@/lib/media";
import { Clip, Track, TrackKind, isMediaClip, isShapeClip, isTextClip } from "@/lib/types";
import { cn } from "@/lib/cn";

const HEADER_W = 132;
const RULER_H = 28;

const TRACK_ICON: Record<TrackKind, typeof VideoIcon> = {
  video: VideoIcon,
  audio: Music,
  text: Type,
  overlay: Square,
};

const TRACK_COLOR: Record<TrackKind, string> = {
  video: "var(--color-track-video)",
  audio: "var(--color-track-audio)",
  text: "var(--color-track-text)",
  overlay: "var(--color-track-overlay)",
};

type DragMode = "move" | "trim-start" | "trim-end";

interface DragState {
  mode: DragMode;
  clipId: string;
  originX: number;
  originStart: number;
  originDuration: number;
  originTrimIn: number;
  originTrackId: string;
}

export function Timeline() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);

  const clips = useEditor((s) => s.clips);
  const tracks = useEditor((s) => s.tracks);
  const playhead = useEditor((s) => s.playhead);
  const pxPerSecond = useEditor((s) => s.pxPerSecond);
  const snapEnabled = useEditor((s) => s.snapEnabled);
  const selectedClipId = useEditor((s) => s.selectedClipId);
  const settings = useEditor((s) => s.settings);
  const duration = useEditor((s) => s.duration());

  const setPlayhead = useEditor((s) => s.setPlayhead);
  const setPlaying = useEditor((s) => s.setPlaying);
  const select = useEditor((s) => s.select);
  const setZoom = useEditor((s) => s.setZoom);
  const toggleSnap = useEditor((s) => s.toggleSnap);
  const updateClip = useEditor((s) => s.updateClip);
  const updateTrack = useEditor((s) => s.updateTrack);
  const addTrack = useEditor((s) => s.addTrack);
  const splitAtPlayhead = useEditor((s) => s.splitAtPlayhead);
  const removeClip = useEditor((s) => s.removeClip);
  const duplicateClip = useEditor((s) => s.duplicateClip);
  const commit = useEditor((s) => s.commit);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);

  // Always leave room to drag past the end of the material.
  const timelineWidth = Math.max((duration + 8) * pxPerSecond, 1200);

  const xToTime = useCallback(
    (clientX: number) => {
      const lane = laneRef.current;
      const scroll = scrollRef.current;
      if (!lane || !scroll) return 0;
      const rect = lane.getBoundingClientRect();
      return Math.max(0, (clientX - rect.left) / pxPerSecond);
    },
    [pxPerSecond]
  );

  const scrub = useCallback(
    (clientX: number) => {
      setPlaying(false);
      setPlayhead(xToTime(clientX));
    },
    [setPlayhead, setPlaying, xToTime]
  );

  const onRulerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrub(e.clientX);
    const move = (ev: PointerEvent) => scrub(ev.clientX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const beginDrag = (e: React.PointerEvent, clip: Clip, mode: DragMode) => {
    e.stopPropagation();
    const track = tracks.find((t) => t.id === clip.trackId);
    if (track?.locked) return;

    select(clip.id);
    commit();
    dragRef.current = {
      mode,
      clipId: clip.id,
      originX: e.clientX,
      originStart: clip.start,
      originDuration: clip.duration,
      originTrimIn: isMediaClip(clip) ? clip.trimIn : 0,
      originTrackId: clip.trackId,
    };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;

    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const state = useEditor.getState();
      const clip = state.clips.find((c) => c.id === d.clipId);
      if (!clip) return;

      const deltaSeconds = (e.clientX - d.originX) / state.pxPerSecond;
      const tolerance = 8 / state.pxPerSecond;
      const others = state.clips.filter((c) => c.id !== d.clipId);

      if (d.mode === "move") {
        let start = Math.max(0, d.originStart + deltaSeconds);
        if (state.snapEnabled) {
          const snappedStart = snapTime(start, others, state.playhead, tolerance);
          const snappedEnd = snapTime(start + clip.duration, others, state.playhead, tolerance);
          // Snap whichever edge is closer to a landmark.
          start =
            Math.abs(snappedStart - start) <= Math.abs(snappedEnd - (start + clip.duration))
              ? snappedStart
              : snappedEnd - clip.duration;
          start = Math.max(0, start);
        }

        // Vertical drag moves the clip between compatible tracks.
        const laneEl = laneRef.current;
        let trackId = d.originTrackId;
        if (laneEl) {
          const rect = laneEl.getBoundingClientRect();
          let y = e.clientY - rect.top;
          for (const t of state.tracks) {
            if (y < t.height) {
              const compatible =
                (clip.type === "audio" && t.kind === "audio") ||
                ((clip.type === "text" || clip.type === "shape") && t.kind === "text") ||
                ((clip.type === "video" || clip.type === "image") &&
                  (t.kind === "video" || t.kind === "overlay"));
              if (compatible && !t.locked) trackId = t.id;
              break;
            }
            y -= t.height;
          }
        }
        state.moveClip(d.clipId, start, trackId);
        return;
      }

      if (d.mode === "trim-start") {
        // Trimming the head shortens the clip and pushes into the source.
        const maxDelta = d.originDuration - 0.1;
        let delta = Math.min(maxDelta, deltaSeconds);
        if (isMediaClip(clip) && clip.type !== "image") {
          delta = Math.max(delta, -d.originTrimIn / clip.speed);
        }
        let start = Math.max(0, d.originStart + delta);
        if (state.snapEnabled) start = snapTime(start, others, state.playhead, tolerance);
        const applied = start - d.originStart;
        const patch: Partial<Clip> = {
          start,
          duration: d.originDuration - applied,
        } as Partial<Clip>;
        if (isMediaClip(clip)) {
          (patch as Partial<typeof clip>).trimIn = Math.max(0, d.originTrimIn + applied * clip.speed);
        }
        updateClip(d.clipId, patch);
        return;
      }

      // trim-end
      let end = d.originStart + d.originDuration + deltaSeconds;
      if (state.snapEnabled) end = snapTime(end, others, state.playhead, tolerance);
      let nextDuration = Math.max(0.1, end - d.originStart);
      if (isMediaClip(clip) && clip.type !== "image") {
        const asset = state.assets.find((a) => a.id === clip.assetId);
        if (asset && asset.duration > 0) {
          const available = (asset.duration - clip.trimIn) / clip.speed;
          nextDuration = Math.min(nextDuration, Math.max(0.1, available));
        }
      }
      updateClip(d.clipId, { duration: nextDuration } as Partial<Clip>);
    };

    const up = () => {
      dragRef.current = null;
      setDragging(false);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, updateClip]);

  // Ctrl+wheel zooms around the cursor; plain wheel scrolls.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const state = useEditor.getState();
      const rect = el.getBoundingClientRect();
      const cursorTime = (e.clientX - rect.left + el.scrollLeft - HEADER_W) / state.pxPerSecond;
      const next = Math.min(400, Math.max(10, state.pxPerSecond * (e.deltaY < 0 ? 1.12 : 0.89)));
      state.setZoom(next);
      requestAnimationFrame(() => {
        el.scrollLeft = cursorTime * next - (e.clientX - rect.left) + HEADER_W;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const selectedClip = clips.find((c) => c.id === selectedClipId);

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink-900">
      <div className="flex shrink-0 items-center gap-1 border-b border-ink-700 px-3 py-2">
        <ToolButton onClick={undo} label="Undo" hint="Ctrl+Z">
          <Undo2 size={15} />
        </ToolButton>
        <ToolButton onClick={redo} label="Redo" hint="Ctrl+Shift+Z">
          <Redo2 size={15} />
        </ToolButton>

        <Divider />

        <ToolButton onClick={splitAtPlayhead} label="Split" hint="S" accent>
          <Scissors size={15} />
        </ToolButton>
        <ToolButton
          onClick={() => selectedClipId && duplicateClip(selectedClipId)}
          label="Duplicate"
          hint="Ctrl+D"
          disabled={!selectedClip}
        >
          <Copy size={15} />
        </ToolButton>
        <ToolButton
          onClick={() => selectedClipId && removeClip(selectedClipId)}
          label="Delete"
          hint="Del"
          disabled={!selectedClip}
        >
          <Trash2 size={15} />
        </ToolButton>

        <Divider />

        <ToolButton onClick={toggleSnap} label="Snap" hint="Toggle snapping" active={snapEnabled}>
          <Magnet size={15} />
        </ToolButton>

        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 font-mono text-[10px] text-ink-500">
            {formatTime(duration, true, settings.fps)}
          </span>
          <ToolButton onClick={() => setZoom(pxPerSecond * 0.75)} label="Zoom out">
            <ZoomOut size={15} />
          </ToolButton>
          <input
            type="range"
            min={10}
            max={400}
            value={pxPerSecond}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-24"
            aria-label="Timeline zoom"
          />
          <ToolButton onClick={() => setZoom(pxPerSecond * 1.33)} label="Zoom in">
            <ZoomIn size={15} />
          </ToolButton>
        </div>
      </div>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto">
        <div className="relative flex" style={{ width: HEADER_W + timelineWidth }}>
          <div className="sticky left-0 z-20 shrink-0 bg-ink-900" style={{ width: HEADER_W }}>
            <div
              className="border-b border-r border-ink-700 bg-ink-850"
              style={{ height: RULER_H }}
            />
            {tracks.map((track) => (
              <TrackHeader
                key={track.id}
                track={track}
                onUpdate={(patch) => updateTrack(track.id, patch)}
              />
            ))}
            <div className="border-r border-ink-700 p-1.5">
              <button
                onClick={() => addTrack("overlay")}
                className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-ink-700 py-1.5 text-[10px] text-ink-400 transition hover:border-ink-600 hover:text-ink-200"
              >
                <Plus size={11} /> Track
              </button>
            </div>
          </div>

          <div className="relative flex-1">
            <Ruler
              width={timelineWidth}
              pxPerSecond={pxPerSecond}
              duration={duration}
              onPointerDown={onRulerDown}
            />

            <div ref={laneRef} className="relative" style={{ width: timelineWidth }}>
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={cn(
                    "relative border-b border-ink-800",
                    track.locked && "opacity-50"
                  )}
                  style={{ height: track.height }}
                  onPointerDown={() => select(null)}
                >
                  <GridLines pxPerSecond={pxPerSecond} width={timelineWidth} />
                  {clips
                    .filter((c) => c.trackId === track.id)
                    .map((clip) => (
                      <ClipBlock
                        key={clip.id}
                        clip={clip}
                        track={track}
                        pxPerSecond={pxPerSecond}
                        selected={clip.id === selectedClipId}
                        onDown={beginDrag}
                      />
                    ))}
                </div>
              ))}

              <Playhead x={playhead * pxPerSecond} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ruler({
  width,
  pxPerSecond,
  duration,
  onPointerDown,
}: {
  width: number;
  pxPerSecond: number;
  duration: number;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  // Pick a tick interval that keeps labels roughly 70px apart.
  const candidates = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
  const interval = candidates.find((c) => c * pxPerSecond >= 70) ?? 600;
  const count = Math.ceil(width / (interval * pxPerSecond)) + 1;

  return (
    <div
      className="sticky top-0 z-10 cursor-ew-resize select-none border-b border-ink-700 bg-ink-850"
      style={{ height: RULER_H, width }}
      onPointerDown={onPointerDown}
    >
      {Array.from({ length: count }, (_, i) => {
        const t = i * interval;
        const x = t * pxPerSecond;
        return (
          <div key={i} className="absolute top-0 h-full" style={{ left: x }}>
            <div className="h-2 w-px bg-ink-600" />
            <span className="absolute left-1 top-1.5 font-mono text-[10px] tabular-nums text-ink-400">
              {formatTime(t)}
            </span>
          </div>
        );
      })}
      {duration > 0 && (
        <div
          className="absolute top-0 h-full border-r border-ink-600 bg-ink-800/40"
          style={{ left: duration * pxPerSecond, width: width - duration * pxPerSecond }}
        />
      )}
    </div>
  );
}

function GridLines({ pxPerSecond, width }: { pxPerSecond: number; width: number }) {
  const interval = pxPerSecond >= 70 ? 1 : pxPerSecond >= 25 ? 5 : 15;
  const count = Math.ceil(width / (interval * pxPerSecond));
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="absolute top-0 h-full w-px bg-ink-800/70"
          style={{ left: i * interval * pxPerSecond }}
        />
      ))}
    </div>
  );
}

function Playhead({ x }: { x: number }) {
  return (
    <div className="pointer-events-none absolute top-0 z-30 h-full" style={{ left: x }}>
      <div className="absolute -left-[5px] -top-[26px] h-3 w-[11px] rounded-[2px] bg-blade-400 shadow-[0_0_8px_rgba(255,122,47,0.5)]" />
      <div className="h-full w-px bg-blade-400" />
    </div>
  );
}

function TrackHeader({ track, onUpdate }: { track: Track; onUpdate: (p: Partial<Track>) => void }) {
  const Icon = TRACK_ICON[track.kind];
  const removeTrack = useEditor((s) => s.removeTrack);
  const trackCount = useEditor((s) => s.tracks.length);

  return (
    <div
      className="group flex items-center gap-1.5 border-b border-r border-ink-700 px-2"
      style={{ height: track.height }}
    >
      <span
        className="h-4 w-[3px] shrink-0 rounded-full"
        style={{ background: TRACK_COLOR[track.kind] }}
      />
      <Icon size={12} className="shrink-0 text-ink-400" />
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-ink-200">
        {track.name}
      </span>
      <div className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100">
        {track.kind === "audio" ? (
          <MiniButton onClick={() => onUpdate({ muted: !track.muted })} label="Mute track">
            {track.muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
          </MiniButton>
        ) : (
          <MiniButton onClick={() => onUpdate({ hidden: !track.hidden })} label="Hide track">
            {track.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
          </MiniButton>
        )}
        <MiniButton onClick={() => onUpdate({ locked: !track.locked })} label="Lock track">
          {track.locked ? <Lock size={11} /> : <Unlock size={11} />}
        </MiniButton>
        {trackCount > 1 && (
          <MiniButton onClick={() => removeTrack(track.id)} label="Remove track">
            <Trash2 size={11} />
          </MiniButton>
        )}
      </div>
    </div>
  );
}

function ClipBlock({
  clip,
  track,
  pxPerSecond,
  selected,
  onDown,
}: {
  clip: Clip;
  track: Track;
  pxPerSecond: number;
  selected: boolean;
  onDown: (e: React.PointerEvent, clip: Clip, mode: DragMode) => void;
}) {
  const asset = useEditor((s) => (isMediaClip(clip) ? s.assetById(clip.assetId) : undefined));
  const width = Math.max(6, clip.duration * pxPerSecond);
  const colour = TRACK_COLOR[track.kind];

  const label = isTextClip(clip)
    ? clip.text.slice(0, 40) || "Text"
    : isShapeClip(clip)
      ? clip.shape
      : (asset?.name ?? "Clip");

  return (
    <div
      className={cn(
        "group absolute top-[3px] cursor-grab overflow-hidden rounded-[5px] active:cursor-grabbing",
        "ring-1 transition-shadow",
        selected
          ? "z-10 ring-2 ring-blade-400 shadow-[0_2px_14px_-2px_rgba(255,122,47,0.55)]"
          : "ring-black/40 hover:ring-ink-500"
      )}
      style={{
        left: clip.start * pxPerSecond,
        width,
        height: track.height - 7,
        background: `linear-gradient(180deg, color-mix(in srgb, ${colour} 42%, #12141700), color-mix(in srgb, ${colour} 26%, #121417))`,
      }}
      onPointerDown={(e) => onDown(e, clip, "move")}
    >
      {asset?.thumbnail && clip.type !== "audio" && (
        <div
          className="absolute inset-0 opacity-45"
          style={{
            backgroundImage: `url(${asset.thumbnail})`,
            backgroundSize: "auto 100%",
            backgroundRepeat: "repeat-x",
          }}
        />
      )}
      {clip.type === "audio" && <Waveform colour={colour} />}

      <div className="relative flex h-full items-start px-2 pt-1">
        <span className="truncate text-[10px] font-medium text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {label}
        </span>
      </div>

      {clip.transitionIn.kind !== "none" && (
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-white/25 to-transparent"
          style={{ width: Math.min(width / 2, clip.transitionIn.duration * pxPerSecond) }}
          title={`Transition: ${clip.transitionIn.kind}`}
        />
      )}

      <TrimHandle side="start" onDown={(e) => onDown(e, clip, "trim-start")} />
      <TrimHandle side="end" onDown={(e) => onDown(e, clip, "trim-end")} />
    </div>
  );
}

function TrimHandle({ side, onDown }: { side: "start" | "end"; onDown: (e: React.PointerEvent) => void }) {
  return (
    <div
      onPointerDown={onDown}
      className={cn(
        "absolute top-0 z-10 h-full w-2 cursor-ew-resize",
        "opacity-0 transition group-hover:opacity-100",
        side === "start" ? "left-0" : "right-0"
      )}
    >
      <div
        className={cn(
          "absolute top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-white/85",
          side === "start" ? "left-[3px]" : "right-[3px]"
        )}
      />
    </div>
  );
}

/** A deterministic stand-in waveform. Real peaks would need a decode pass we
 *  deliberately keep off the interaction path. */
function Waveform({ colour }: { colour: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex h-1/2 items-end gap-[2px] px-1 opacity-60">
      {Array.from({ length: 60 }, (_, i) => (
        <span
          key={i}
          className="flex-1 rounded-t-[1px]"
          style={{
            background: colour,
            height: `${25 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)) * 70}%`,
          }}
        />
      ))}
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  label,
  hint,
  active,
  accent,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  hint?: string;
  active?: boolean;
  accent?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={hint ? `${label} · ${hint}` : label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition",
        "disabled:pointer-events-none disabled:opacity-30",
        active
          ? "bg-blade-500/15 text-blade-300"
          : accent
            ? "text-ink-200 hover:bg-blade-500/15 hover:text-blade-300"
            : "text-ink-400 hover:bg-ink-750 hover:text-ink-100",
        "active:scale-95"
      )}
    >
      {children}
    </button>
  );
}

function MiniButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={label}
      className="flex h-5 w-5 items-center justify-center rounded text-ink-400 transition hover:bg-ink-750 hover:text-ink-100"
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-4 w-px bg-ink-700" />;
