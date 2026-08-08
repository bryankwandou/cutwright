"use client";

import {
  ALL_FORMATS,
  BlobSource,
  CanvasSink,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  WebMOutputFormat,
  Output,
  BufferTarget,
  AudioBufferSource,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  QUALITY_LOW,
  QUALITY_VERY_HIGH,
  getFirstEncodableVideoCodec,
  getFirstEncodableAudioCodec,
} from "mediabunny";
import { FrameProvider, renderFrame } from "./compositor";
import { Clip, MediaAsset, ProjectSettings, Track, isMediaClip } from "./types";

export type QualityLevel = "low" | "medium" | "high" | "max";
export type ContainerFormat = "mp4" | "webm";

export interface ExportOptions {
  width: number;
  height: number;
  fps: number;
  quality: QualityLevel;
  format: ContainerFormat;
  includeAudio: boolean;
}

export interface ExportProgress {
  stage: "preparing" | "audio" | "rendering" | "finalising" | "done";
  /** 0..1 */
  progress: number;
  message: string;
}

const QUALITY_MAP = {
  low: QUALITY_LOW,
  medium: QUALITY_MEDIUM,
  high: QUALITY_HIGH,
  max: QUALITY_VERY_HIGH,
} as const;

export const QUALITY_PRESETS: { id: QualityLevel; label: string; note: string }[] = [
  { id: "low", label: "Draft", note: "Smallest file, quickest render" },
  { id: "medium", label: "Standard", note: "Good balance for social" },
  { id: "high", label: "High", note: "Recommended for publishing" },
  { id: "max", label: "Maximum", note: "Largest file, slowest render" },
];

/** True when the browser can encode at all. Checked before the dialog opens. */
export function canExport(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window && "VideoDecoder" in window;
}

/**
 * Mixes every audio-bearing clip into one buffer using an OfflineAudioContext.
 * Volume, speed, and fades are applied per clip via a gain node.
 */
async function renderAudioMix(
  clips: Clip[],
  tracks: Track[],
  assets: MediaAsset[],
  totalDuration: number,
  sampleRate = 48000
): Promise<AudioBuffer | null> {
  const audible = clips.filter((c) => {
    if (!isMediaClip(c) || c.type === "image") return false;
    const track = tracks.find((t) => t.id === c.trackId);
    return !track?.muted && c.volume > 0;
  });
  if (!audible.length || totalDuration <= 0) return null;

  const ctx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
  const decoded = new Map<string, AudioBuffer>();

  for (const clip of audible) {
    if (!isMediaClip(clip)) continue;
    const asset = assets.find((a) => a.id === clip.assetId);
    if (!asset) continue;

    let buffer = decoded.get(asset.id);
    if (!buffer) {
      try {
        const bytes = await fetch(asset.url).then((r) => r.arrayBuffer());
        buffer = await ctx.decodeAudioData(bytes);
        decoded.set(asset.id, buffer);
      } catch {
        // Silent video tracks decode to nothing; that is not an error.
        continue;
      }
    }

    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.playbackRate.value = clip.speed;

    const gain = ctx.createGain();
    const start = clip.start;
    const end = clip.start + clip.duration;
    gain.gain.setValueAtTime(clip.volume, start);
    if (clip.fadeIn > 0) {
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(clip.volume, start + clip.fadeIn);
    }
    if (clip.fadeOut > 0) {
      gain.gain.setValueAtTime(clip.volume, Math.max(start, end - clip.fadeOut));
      gain.gain.linearRampToValueAtTime(0, end);
    }

    node.connect(gain).connect(ctx.destination);
    node.start(start, clip.trimIn, clip.duration * clip.speed);
  }

  return ctx.startRendering();
}

interface DecodedSource {
  sink: CanvasSink | null;
  image: HTMLImageElement | null;
  width: number;
  height: number;
}

/**
 * Renders the timeline to a video file entirely on-device. Nothing is uploaded,
 * and no watermark is drawn — the export path uses the same compositor as the
 * preview, so what you see is what lands in the file.
 */
export async function exportProject(
  opts: ExportOptions,
  data: { clips: Clip[]; tracks: Track[]; assets: MediaAsset[]; settings: ProjectSettings },
  onProgress: (p: ExportProgress) => void,
  signal?: AbortSignal
): Promise<Blob> {
  const { clips, tracks, assets } = data;
  const { width, height, fps } = opts;

  const totalDuration = clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);
  if (totalDuration <= 0) throw new Error("The timeline is empty — add a clip before exporting.");

  onProgress({ stage: "preparing", progress: 0, message: "Opening media…" });

  // Decode setup: one sink per video asset, one Image per still.
  const sources = new Map<string, DecodedSource>();
  const usedAssetIds = new Set(
    clips.filter(isMediaClip).filter((c) => c.type !== "audio").map((c) => c.assetId)
  );

  for (const assetId of usedAssetIds) {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) continue;
    if (asset.kind === "image") {
      const img = new Image();
      img.src = asset.url;
      await img.decode().catch(() => undefined);
      sources.set(assetId, { sink: null, image: img, width: img.naturalWidth, height: img.naturalHeight });
      continue;
    }
    try {
      const blob = await fetch(asset.url).then((r) => r.blob());
      const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(blob) });
      const track = await input.getPrimaryVideoTrack();
      if (!track) continue;
      sources.set(assetId, {
        sink: new CanvasSink(track, { poolSize: 2 }),
        image: null,
        width: track.displayWidth,
        height: track.displayHeight,
      });
    } catch {
      // An asset we cannot decode is skipped rather than failing the export.
    }
  }

  // Audio is rendered up front so encoder backpressure never stalls on it.
  let audioBuffer: AudioBuffer | null = null;
  if (opts.includeAudio) {
    onProgress({ stage: "audio", progress: 0.02, message: "Mixing audio…" });
    audioBuffer = await renderAudioMix(clips, tracks, assets, totalDuration).catch(() => null);
  }

  const outputFormat = opts.format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat();
  const videoCodec = await getFirstEncodableVideoCodec(outputFormat.getSupportedVideoCodecs(), {
    width,
    height,
  });
  if (!videoCodec) {
    throw new Error(
      `This browser cannot encode ${opts.format.toUpperCase()} at ${width}×${height}. Try WebM, or a smaller resolution.`
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: false });
  if (!ctx) throw new Error("Could not create a rendering context.");

  const scratch = document.createElement("canvas");
  scratch.width = width;
  scratch.height = height;

  const output = new Output({ format: outputFormat, target: new BufferTarget() });
  const videoSource = new CanvasSource(canvas, {
    codec: videoCodec,
    bitrate: QUALITY_MAP[opts.quality],
  });
  output.addVideoTrack(videoSource, { frameRate: fps });

  let audioSource: AudioBufferSource | null = null;
  if (audioBuffer) {
    const audioCodec = await getFirstEncodableAudioCodec(outputFormat.getSupportedAudioCodecs(), {
      numberOfChannels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
    });
    if (audioCodec) {
      audioSource = new AudioBufferSource({ codec: audioCodec, bitrate: QUALITY_HIGH });
      output.addAudioTrack(audioSource);
    }
  }

  await output.start();
  if (audioSource && audioBuffer) await audioSource.add(audioBuffer);

  // Frames decoded for the current timestamp, read synchronously by the compositor.
  const frameCache = new Map<string, CanvasImageSource>();
  const provider: FrameProvider = {
    get: (assetId) => frameCache.get(assetId) ?? null,
    size: (assetId) => {
      const s = sources.get(assetId);
      return s ? { width: s.width, height: s.height } : null;
    },
  };

  const settings: ProjectSettings = { ...data.settings, width, height, fps };
  const totalFrames = Math.ceil(totalDuration * fps);

  for (let frame = 0; frame < totalFrames; frame++) {
    if (signal?.aborted) throw new DOMException("Export cancelled", "AbortError");
    const time = frame / fps;

    // Pre-decode every source visible at this instant.
    frameCache.clear();
    const visible = clips.filter(
      (c) => isMediaClip(c) && c.type !== "audio" && time >= c.start - 1 && time < c.start + c.duration + 1
    );
    for (const clip of visible) {
      if (!isMediaClip(clip)) continue;
      const src = sources.get(clip.assetId);
      if (!src) continue;
      if (src.image) {
        frameCache.set(clip.assetId, src.image);
      } else if (src.sink) {
        const sourceTime = clip.trimIn + Math.max(0, time - clip.start) * clip.speed;
        const wrapped = await src.sink.getCanvas(sourceTime).catch(() => null);
        if (wrapped) frameCache.set(clip.assetId, wrapped.canvas);
      }
    }

    renderFrame({ ctx, scratch, settings, tracks, clips, provider }, time);
    await videoSource.add(time, 1 / fps);

    if (frame % 5 === 0 || frame === totalFrames - 1) {
      onProgress({
        stage: "rendering",
        progress: 0.05 + (frame / totalFrames) * 0.9,
        message: `Rendering frame ${frame + 1} of ${totalFrames}`,
      });
    }
  }

  onProgress({ stage: "finalising", progress: 0.97, message: "Writing file…" });
  await output.finalize();

  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new Error("Encoding finished but produced no data.");

  onProgress({ stage: "done", progress: 1, message: "Done" });
  return new Blob([buffer], { type: opts.format === "webm" ? "video/webm" : "video/mp4" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
