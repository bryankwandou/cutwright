"use client";

import { create } from "zustand";
import {
  Clip,
  MediaAsset,
  ProjectSettings,
  Track,
  TrackKind,
  defaultAnimation,
  defaultGrade,
  defaultKeying,
  defaultTextStyle,
  defaultTransform,
  isMediaClip,
  isVisual,
} from "./types";

export const uid = (prefix = "id") =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

/** The slice of state that undo/redo restores. Playhead and selection are excluded. */
interface Snapshot {
  tracks: Track[];
  clips: Clip[];
  settings: ProjectSettings;
}

interface EditorState extends Snapshot {
  assets: MediaAsset[];
  playhead: number;
  playing: boolean;
  selectedClipId: string | null;
  /** Timeline zoom, in pixels per second. */
  pxPerSecond: number;
  snapEnabled: boolean;
  past: Snapshot[];
  future: Snapshot[];

  duration: () => number;
  clipsAt: (time: number) => Clip[];
  selectedClip: () => Clip | null;
  assetById: (id: string) => MediaAsset | undefined;

  commit: () => void;
  undo: () => void;
  redo: () => void;

  addAsset: (asset: MediaAsset) => void;
  removeAsset: (id: string) => void;

  addTrack: (kind: TrackKind) => string;
  removeTrack: (id: string) => void;
  updateTrack: (id: string, patch: Partial<Track>) => void;

  addClip: (clip: Clip) => void;
  addAssetToTimeline: (assetId: string, atTime?: number) => void;
  addTextClip: (atTime?: number) => void;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  moveClip: (id: string, start: number, trackId?: string) => void;
  removeClip: (id: string) => void;
  duplicateClip: (id: string) => void;
  splitAtPlayhead: () => void;

  setPlayhead: (t: number) => void;
  setPlaying: (p: boolean) => void;
  select: (id: string | null) => void;
  setZoom: (px: number) => void;
  toggleSnap: () => void;
  updateSettings: (patch: Partial<ProjectSettings>) => void;
  reset: () => void;
}

const snapshot = (s: Snapshot): Snapshot =>
  JSON.parse(JSON.stringify({ tracks: s.tracks, clips: s.clips, settings: s.settings }));

const baseTracks = (): Track[] => [
  { id: "t_text", kind: "text", name: "Text", muted: false, hidden: false, locked: false, height: 44 },
  { id: "t_overlay", kind: "overlay", name: "Overlay", muted: false, hidden: false, locked: false, height: 56 },
  { id: "t_video", kind: "video", name: "Video", muted: false, hidden: false, locked: false, height: 68 },
  { id: "t_audio", kind: "audio", name: "Audio", muted: false, hidden: false, locked: false, height: 52 },
];

const baseSettings = (): ProjectSettings => ({
  name: "Untitled project",
  width: 1080,
  height: 1920,
  fps: 30,
  background: "#000000",
});

const clipDefaults = () => ({
  transform: defaultTransform(),
  grade: defaultGrade(),
  animation: defaultAnimation(),
  transitionIn: { kind: "none" as const, duration: 0.5 },
  lut: "none",
  keying: defaultKeying(),
});

/** Tracks a clip can legally live on. */
const trackFor = (tracks: Track[], type: Clip["type"]): Track | undefined => {
  if (type === "audio") return tracks.find((t) => t.kind === "audio");
  if (type === "text" || type === "shape") return tracks.find((t) => t.kind === "text");
  return tracks.find((t) => t.kind === "video");
};

export const useEditor = create<EditorState>((set, get) => ({
  tracks: baseTracks(),
  clips: [],
  assets: [],
  settings: baseSettings(),
  playhead: 0,
  playing: false,
  selectedClipId: null,
  pxPerSecond: 70,
  snapEnabled: true,
  past: [],
  future: [],

  duration: () => {
    const { clips } = get();
    if (!clips.length) return 0;
    return clips.reduce((max, c) => Math.max(max, c.start + c.duration), 0);
  },

  clipsAt: (time) => get().clips.filter((c) => time >= c.start && time < c.start + c.duration),

  selectedClip: () => {
    const { clips, selectedClipId } = get();
    return clips.find((c) => c.id === selectedClipId) ?? null;
  },

  assetById: (id) => get().assets.find((a) => a.id === id),

  commit: () =>
    set((s) => ({ past: [...s.past.slice(-49), snapshot(s)], future: [] })),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return s;
      return {
        ...prev,
        past: s.past.slice(0, -1),
        future: [snapshot(s), ...s.future].slice(0, 50),
        selectedClipId: prev.clips.some((c) => c.id === s.selectedClipId) ? s.selectedClipId : null,
      };
    }),

  redo: () =>
    set((s) => {
      const next = s.future[0];
      if (!next) return s;
      return {
        ...next,
        past: [...s.past, snapshot(s)],
        future: s.future.slice(1),
        selectedClipId: next.clips.some((c) => c.id === s.selectedClipId) ? s.selectedClipId : null,
      };
    }),

  addAsset: (asset) => set((s) => ({ assets: [...s.assets, asset] })),

  removeAsset: (id) =>
    set((s) => {
      const asset = s.assets.find((a) => a.id === id);
      if (asset) URL.revokeObjectURL(asset.url);
      return {
        assets: s.assets.filter((a) => a.id !== id),
        clips: s.clips.filter((c) => !(isMediaClip(c) && c.assetId === id)),
      };
    }),

  addTrack: (kind) => {
    const id = uid("t");
    const label = kind[0].toUpperCase() + kind.slice(1);
    get().commit();
    set((s) => {
      const count = s.tracks.filter((t) => t.kind === kind).length + 1;
      const track: Track = {
        id,
        kind,
        name: `${label} ${count}`,
        muted: false,
        hidden: false,
        locked: false,
        height: kind === "text" ? 44 : kind === "audio" ? 52 : 60,
      };
      // Keep visual stacking order sane: text on top, audio at the bottom.
      const order: TrackKind[] = ["text", "overlay", "video", "audio"];
      const next = [...s.tracks, track].sort(
        (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)
      );
      return { tracks: next };
    });
    return id;
  },

  removeTrack: (id) => {
    get().commit();
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== id),
      clips: s.clips.filter((c) => c.trackId !== id),
    }));
  },

  updateTrack: (id, patch) =>
    set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

  addClip: (clip) => {
    get().commit();
    set((s) => ({ clips: [...s.clips, clip], selectedClipId: clip.id }));
  },

  addAssetToTimeline: (assetId, atTime) => {
    const s = get();
    const asset = s.assets.find((a) => a.id === assetId);
    if (!asset) return;
    const track = trackFor(s.tracks, asset.kind);
    if (!track) return;

    // Drop the clip at the playhead, or after the last clip on that track if
    // the playhead would land inside existing material.
    const onTrack = s.clips.filter((c) => c.trackId === track.id);
    const requested = atTime ?? s.playhead;
    const overlaps = onTrack.some(
      (c) => requested < c.start + c.duration && requested >= c.start
    );
    const start = overlaps
      ? onTrack.reduce((max, c) => Math.max(max, c.start + c.duration), 0)
      : requested;

    const clip: Clip = {
      id: uid("c"),
      trackId: track.id,
      start,
      duration: asset.kind === "image" ? 4 : asset.duration,
      type: asset.kind,
      assetId,
      trimIn: 0,
      volume: 1,
      speed: 1,
      fadeIn: 0,
      fadeOut: 0,
      ...clipDefaults(),
    };
    s.addClip(clip);
  },

  addTextClip: (atTime) => {
    const s = get();
    const track = s.tracks.find((t) => t.kind === "text");
    if (!track) return;
    const clip: Clip = {
      id: uid("c"),
      trackId: track.id,
      start: atTime ?? s.playhead,
      duration: 3,
      type: "text",
      text: "Your text here",
      style: defaultTextStyle(),
      ...clipDefaults(),
      animation: { ...defaultAnimation(), enter: "fade-in", exit: "fade-out" },
    };
    s.addClip(clip);
  },

  updateClip: (id, patch) =>
    set((s) => ({
      clips: s.clips.map((c) => (c.id === id ? ({ ...c, ...patch } as Clip) : c)),
    })),

  moveClip: (id, start, trackId) => {
    set((s) => ({
      clips: s.clips.map((c) =>
        c.id === id ? ({ ...c, start: Math.max(0, start), trackId: trackId ?? c.trackId } as Clip) : c
      ),
    }));
  },

  removeClip: (id) => {
    get().commit();
    set((s) => ({
      clips: s.clips.filter((c) => c.id !== id),
      selectedClipId: s.selectedClipId === id ? null : s.selectedClipId,
    }));
  },

  duplicateClip: (id) => {
    const s = get();
    const clip = s.clips.find((c) => c.id === id);
    if (!clip) return;
    const copy = { ...JSON.parse(JSON.stringify(clip)), id: uid("c"), start: clip.start + clip.duration };
    s.addClip(copy);
  },

  splitAtPlayhead: () => {
    const s = get();
    const t = s.playhead;
    // Split every visual clip under the playhead, plus audio on unmuted tracks —
    // this mirrors how a razor tool behaves when nothing specific is selected.
    const targets = s.clips.filter((c) => t > c.start + 0.02 && t < c.start + c.duration - 0.02);
    if (!targets.length) return;
    s.commit();
    set((state) => {
      const additions: Clip[] = [];
      const clips = state.clips.map((c) => {
        if (!targets.some((x) => x.id === c.id)) return c;
        const localOffset = t - c.start;
        const right: Clip = {
          ...(JSON.parse(JSON.stringify(c)) as Clip),
          id: uid("c"),
          start: t,
          duration: c.duration - localOffset,
        };
        if (isMediaClip(right) && isMediaClip(c)) {
          right.trimIn = c.trimIn + localOffset * c.speed;
        }
        // The right half inherits no entrance animation; the left keeps no exit.
        right.animation = { ...right.animation, enter: "none" };
        additions.push(right);
        return { ...c, duration: localOffset, animation: { ...c.animation, exit: "none" } } as Clip;
      });
      return { clips: [...clips, ...additions] };
    });
  },

  setPlayhead: (t) => set({ playhead: Math.max(0, t) }),
  setPlaying: (playing) => set({ playing }),
  select: (id) => set({ selectedClipId: id }),
  setZoom: (px) => set({ pxPerSecond: Math.min(400, Math.max(10, px)) }),
  toggleSnap: () => set((s) => ({ snapEnabled: !s.snapEnabled })),

  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  reset: () =>
    set({
      tracks: baseTracks(),
      clips: [],
      settings: baseSettings(),
      playhead: 0,
      selectedClipId: null,
      past: [],
      future: [],
    }),
}));

/** Snap candidates: clip edges on every track, plus the playhead and zero. */
export function snapTime(time: number, clips: Clip[], playhead: number, tolerance: number, ignoreId?: string) {
  const points = [0, playhead];
  for (const c of clips) {
    if (c.id === ignoreId) continue;
    points.push(c.start, c.start + c.duration);
  }
  let best = time;
  let bestDelta = tolerance;
  for (const p of points) {
    const d = Math.abs(p - time);
    if (d < bestDelta) {
      bestDelta = d;
      best = p;
    }
  }
  return best;
}

export { isVisual };
