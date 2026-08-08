"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Download, Loader2, X } from "lucide-react";
import { useEditor } from "@/lib/store";
import {
  ContainerFormat,
  ExportProgress,
  QUALITY_PRESETS,
  QualityLevel,
  canExport,
  downloadBlob,
  exportProject,
} from "@/lib/export";
import { formatBytes, formatTime } from "@/lib/media";
import { ASPECT_PRESETS } from "@/lib/types";
import { cn } from "@/lib/cn";

export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useEditor((s) => s.settings);
  const duration = useEditor((s) => s.duration());

  const [quality, setQuality] = useState<QualityLevel>("high");
  const [format, setFormat] = useState<ContainerFormat>("mp4");
  const [scale, setScale] = useState(1);
  const [fps, setFps] = useState(settings.fps);
  const [includeAudio, setIncludeAudio] = useState(true);

  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; name: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const width = Math.round((settings.width * scale) / 2) * 2;
  const height = Math.round((settings.height * scale) / 2) * 2;
  const supported = canExport();

  useEffect(() => {
    if (!open) {
      setProgress(null);
      setError(null);
      setResult(null);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !progress) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, progress]);

  if (!open) return null;

  const run = async () => {
    setError(null);
    setResult(null);
    const controller = new AbortController();
    abortRef.current = controller;

    const state = useEditor.getState();
    try {
      const blob = await exportProject(
        { width, height, fps, quality, format, includeAudio },
        {
          clips: state.clips,
          tracks: state.tracks,
          assets: state.assets,
          settings: state.settings,
        },
        setProgress,
        controller.signal
      );
      const name = `${state.settings.name.replace(/[^a-z0-9-_ ]/gi, "").trim() || "cutwright"}.${format}`;
      setResult({ blob, name });
      downloadBlob(blob, name);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Export failed for an unknown reason.");
      }
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  };

  const busy = progress !== null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Export video"
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl">
        <header className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-ink-50">Export</h2>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded p-1 text-ink-400 transition hover:bg-ink-800 hover:text-ink-100 disabled:opacity-30"
          >
            <X size={16} />
          </button>
        </header>

        {!supported ? (
          <div className="flex gap-3 p-5">
            <AlertTriangle size={18} className="shrink-0 text-amber-400" />
            <div>
              <p className="text-sm text-ink-100">This browser cannot encode video</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-400">
                Cutwright encodes through WebCodecs, which needs Chrome 94+, Edge 94+, Firefox 130+,
                or Safari 26+. Everything else in the editor still works here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <Field label="Format">
              <div className="flex gap-1.5">
                {(["mp4", "webm"] as ContainerFormat[]).map((f) => (
                  <Pill key={f} active={format === f} onClick={() => setFormat(f)} disabled={busy}>
                    {f.toUpperCase()}
                  </Pill>
                ))}
              </div>
            </Field>

            <Field label="Quality">
              <div className="grid grid-cols-2 gap-1.5">
                {QUALITY_PRESETS.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setQuality(q.id)}
                    disabled={busy}
                    className={cn(
                      "rounded-md border px-2.5 py-2 text-left transition disabled:opacity-50",
                      quality === q.id
                        ? "border-blade-400 bg-blade-500/10"
                        : "border-ink-700 hover:border-ink-500"
                    )}
                  >
                    <span className={cn("block text-[11px] font-medium", quality === q.id ? "text-blade-200" : "text-ink-100")}>
                      {q.label}
                    </span>
                    <span className="block text-[9px] text-ink-500">{q.note}</span>
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Resolution">
              <div className="flex gap-1.5">
                {[0.5, 0.75, 1].map((s) => (
                  <Pill key={s} active={scale === s} onClick={() => setScale(s)} disabled={busy}>
                    {Math.round((settings.height * s) / 2) * 2}p
                  </Pill>
                ))}
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-ink-500">
                {width} × {height}
              </p>
            </Field>

            <Field label="Frame rate">
              <div className="flex gap-1.5">
                {[24, 30, 60].map((f) => (
                  <Pill key={f} active={fps === f} onClick={() => setFps(f)} disabled={busy}>
                    {f} fps
                  </Pill>
                ))}
              </div>
            </Field>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-300">
              <input
                type="checkbox"
                checked={includeAudio}
                onChange={(e) => setIncludeAudio(e.target.checked)}
                disabled={busy}
                className="accent-blade-500"
              />
              Include audio
            </label>

            <div className="rounded-lg border border-ink-750 bg-ink-950 px-3 py-2.5 text-[11px] text-ink-400">
              <div className="flex justify-between">
                <span>Length</span>
                <span className="font-mono text-ink-200">{formatTime(duration, true, fps)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Frames to render</span>
                <span className="font-mono text-ink-200">{Math.ceil(duration * fps)}</span>
              </div>
            </div>

            {error && (
              <p className="flex gap-2 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-[11px] leading-relaxed text-red-300">
                <AlertTriangle size={13} className="mt-px shrink-0" />
                {error}
              </p>
            )}

            {result && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-[11px] text-emerald-300">
                <Check size={14} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {result.name} · {formatBytes(result.blob.size)}
                </span>
                <button
                  onClick={() => downloadBlob(result.blob, result.name)}
                  className="shrink-0 underline underline-offset-2 hover:text-emerald-200"
                >
                  Save again
                </button>
              </div>
            )}

            {progress && (
              <div>
                <div className="mb-1.5 flex justify-between text-[11px]">
                  <span className="text-ink-200">{progress.message}</span>
                  <span className="font-mono text-ink-400">{Math.round(progress.progress * 100)}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                  <div
                    className="h-full rounded-full bg-blade-500 transition-[width] duration-200"
                    style={{ width: `${progress.progress * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {busy ? (
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="flex-1 rounded-lg border border-ink-700 py-2.5 text-xs font-medium text-ink-200 transition hover:border-ink-600"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={run}
                  disabled={duration <= 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blade-500 py-2.5 text-xs font-semibold text-white transition hover:bg-blade-400 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Render and save
                </button>
              )}
            </div>

            <p className="text-center text-[10px] leading-relaxed text-ink-600">
              Encoding runs on this device. The file is written straight to your downloads —
              nothing is uploaded and no watermark is drawn.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium text-ink-300">{label}</p>
      {children}
    </div>
  );
}

function Pill({
  children,
  active,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 rounded-md border py-1.5 text-[11px] font-medium transition disabled:opacity-50",
        active
          ? "border-blade-400 bg-blade-500/10 text-blade-200"
          : "border-ink-700 text-ink-300 hover:border-ink-500"
      )}
    >
      {children}
    </button>
  );
}
