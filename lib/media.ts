"use client";

import { AssetKind, MediaAsset } from "./types";
import { uid } from "./store";

export function kindOf(file: File): AssetKind | null {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("image/")) return "image";
  // Some containers arrive with an empty MIME type; fall back to the extension.
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "mov", "webm", "mkv", "avi", "m4v"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext)) return "audio";
  if (["png", "jpg", "jpeg", "webp", "gif", "avif", "bmp"].includes(ext)) return "image";
  return null;
}

function grabPoster(video: HTMLVideoElement): string | undefined {
  try {
    const c = document.createElement("canvas");
    const scale = Math.min(1, 320 / Math.max(video.videoWidth, 1));
    c.width = Math.max(1, Math.round(video.videoWidth * scale));
    c.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = c.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.7);
  } catch {
    return undefined;
  }
}

/** Reads duration/dimensions and a poster frame without uploading anything. */
export async function probeFile(file: File): Promise<MediaAsset | null> {
  const kind = kindOf(file);
  if (!kind) return null;
  const url = URL.createObjectURL(file);
  const id = uid("a");

  if (kind === "image") {
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => undefined);
    return {
      id,
      name: file.name,
      kind,
      url,
      duration: 4,
      width: img.naturalWidth || 1080,
      height: img.naturalHeight || 1080,
      thumbnail: url,
    };
  }

  const el = document.createElement(kind === "audio" ? "audio" : "video") as HTMLVideoElement;
  el.src = url;
  el.muted = true;
  el.preload = "metadata";

  const meta = await new Promise<{ duration: number; width: number; height: number }>((resolve) => {
    const done = () =>
      resolve({
        duration: Number.isFinite(el.duration) ? el.duration : 0,
        width: el.videoWidth || 1920,
        height: el.videoHeight || 1080,
      });
    el.onloadedmetadata = done;
    el.onerror = () => resolve({ duration: 0, width: 1920, height: 1080 });
    // Guard against containers that never fire the event.
    setTimeout(done, 5000);
  });

  let thumbnail: string | undefined;
  if (kind === "video" && meta.duration > 0) {
    thumbnail = await new Promise<string | undefined>((resolve) => {
      const onSeeked = () => resolve(grabPoster(el));
      el.onseeked = onSeeked;
      el.onerror = () => resolve(undefined);
      // A frame slightly into the clip avoids the black leader many files start on.
      el.currentTime = Math.min(meta.duration * 0.1, 1);
      setTimeout(() => resolve(undefined), 4000);
    });
  }

  return { id, name: file.name, kind, url, ...meta, thumbnail };
}

export const formatTime = (seconds: number, withFrames = false, fps = 30) => {
  const s = Math.max(0, seconds);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  if (!withFrames) return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  const ff = Math.floor((s % 1) * fps);
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}:${String(ff).padStart(2, "0")}`;
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
};
