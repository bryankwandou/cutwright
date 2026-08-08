"use client";

import { useCallback, useRef, useState } from "react";
import {
  Blend,
  Film,
  Image as ImageIcon,
  Loader2,
  Music,
  Plus,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Upload,
  Wand2,
} from "lucide-react";
import { uid, useEditor } from "@/lib/store";
import { probeFile, formatTime } from "@/lib/media";
import { FILTER_GROUPS, FILTER_PRESETS } from "@/lib/filters";
import { TRANSITIONS } from "@/lib/transitions";
import { ENTER_ANIMATIONS } from "@/lib/animations";
import { TEXT_PRESETS } from "@/lib/text-presets";
import {
  Clip,
  defaultAnimation,
  defaultGrade,
  defaultKeying,
  defaultTransform,
  isVisual,
} from "@/lib/types";
import { cn } from "@/lib/cn";

type Tab = "media" | "text" | "filters" | "transitions" | "motion" | "shapes";

const TABS: { id: Tab; label: string; icon: typeof Film }[] = [
  { id: "media", label: "Media", icon: Film },
  { id: "text", label: "Text", icon: Type },
  { id: "filters", label: "Filters", icon: Wand2 },
  { id: "transitions", label: "Transitions", icon: Blend },
  { id: "motion", label: "Motion", icon: Sparkles },
  { id: "shapes", label: "Shapes", icon: Shapes },
];

export function LibraryPanel() {
  const [tab, setTab] = useState<Tab>("media");

  return (
    <div className="flex h-full min-h-0">
      <nav className="flex w-[68px] shrink-0 flex-col gap-0.5 border-r border-ink-700 bg-ink-950 p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-current={tab === id}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[10px] font-medium transition",
              tab === id
                ? "bg-ink-800 text-blade-300"
                : "text-ink-400 hover:bg-ink-850 hover:text-ink-100"
            )}
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 flex-1 overflow-y-auto bg-ink-900">
        {tab === "media" && <MediaTab />}
        {tab === "text" && <TextTab />}
        {tab === "filters" && <FiltersTab />}
        {tab === "transitions" && <TransitionsTab />}
        {tab === "motion" && <MotionTab />}
        {tab === "shapes" && <ShapesTab />}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-500 first:mt-0">
      {children}
    </h3>
  );
}

function MediaTab() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const assets = useEditor((s) => s.assets);
  const addAsset = useEditor((s) => s.addAsset);
  const removeAsset = useEditor((s) => s.removeAsset);
  const addAssetToTimeline = useEditor((s) => s.addAssetToTimeline);

  const ingest = useCallback(
    async (files: FileList | File[]) => {
      setBusy(true);
      for (const file of Array.from(files)) {
        const asset = await probeFile(file);
        if (asset) addAsset(asset);
      }
      setBusy(false);
    },
    [addAsset]
  );

  return (
    <div className="p-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void ingest(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-3 py-6 text-center transition",
          dragOver
            ? "border-blade-400 bg-blade-500/8"
            : "border-ink-700 hover:border-ink-600 hover:bg-ink-850"
        )}
      >
        {busy ? (
          <Loader2 size={18} className="animate-spin text-blade-400" />
        ) : (
          <Upload size={18} className="text-ink-400" />
        )}
        <span className="text-xs font-medium text-ink-100">
          {busy ? "Reading files…" : "Drop files here"}
        </span>
        <span className="text-[10px] text-ink-500">Video, audio, and stills. Nothing leaves your machine.</span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        className="hidden"
        onChange={(e) => e.target.files && void ingest(e.target.files)}
      />

      {assets.length > 0 && (
        <>
          <SectionTitle>Library · {assets.length}</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="group relative overflow-hidden rounded-lg border border-ink-700 bg-ink-850 transition hover:border-ink-600"
              >
                <div className="relative aspect-video bg-ink-950">
                  {asset.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-ink-600">
                      {asset.kind === "audio" ? <Music size={20} /> : <ImageIcon size={20} />}
                    </div>
                  )}
                  {asset.duration > 0 && (
                    <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 font-mono text-[9px] text-white">
                      {formatTime(asset.duration)}
                    </span>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/65 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => addAssetToTimeline(asset.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-blade-500 text-white transition hover:bg-blade-400 active:scale-95"
                      title="Add to timeline"
                      aria-label="Add to timeline"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeAsset(asset.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-800 text-ink-200 transition hover:bg-ink-700 active:scale-95"
                      title="Remove from library"
                      aria-label="Remove from library"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <p className="truncate px-1.5 py-1 text-[10px] text-ink-300">{asset.name}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TextTab() {
  const addClip = useEditor((s) => s.addClip);
  const playhead = useEditor((s) => s.playhead);
  const tracks = useEditor((s) => s.tracks);

  const insert = (presetId: string) => {
    const preset = TEXT_PRESETS.find((p) => p.id === presetId);
    const track = tracks.find((t) => t.kind === "text");
    if (!preset || !track) return;
    const clip: Clip = {
      id: uid("c"),
      trackId: track.id,
      start: playhead,
      duration: 3,
      type: "text",
      text: preset.sample,
      style: preset.style,
      transform: { ...defaultTransform(), ...preset.transform },
      grade: defaultGrade(),
      animation: { ...defaultAnimation(), ...preset.animation },
      transitionIn: { kind: "none", duration: 0.5 },
      lut: "none",
      keying: defaultKeying(),
    };
    addClip(clip);
  };

  return (
    <div className="p-3">
      <SectionTitle>Title styles</SectionTitle>
      <div className="space-y-2">
        {TEXT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => insert(preset.id)}
            className="group flex w-full items-center gap-3 rounded-lg border border-ink-700 bg-ink-850 p-2.5 text-left transition hover:border-blade-500/50 hover:bg-ink-800"
          >
            <span
              className="grid h-11 w-16 shrink-0 place-items-center overflow-hidden rounded bg-ink-950 text-center"
              style={{ fontFamily: preset.style.fontFamily }}
            >
              <span
                className="truncate px-1 leading-none"
                style={{
                  color: preset.style.color,
                  fontWeight: preset.style.fontWeight,
                  fontSize: 11,
                  textTransform: preset.style.uppercase ? "uppercase" : "none",
                  WebkitTextStroke:
                    preset.style.strokeWidth > 0
                      ? `0.6px ${preset.style.strokeColor}`
                      : undefined,
                  background:
                    preset.style.backgroundColor !== "transparent"
                      ? preset.style.backgroundColor
                      : undefined,
                }}
              >
                Aa
              </span>
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-medium text-ink-100">{preset.label}</span>
              <span className="block truncate text-[10px] text-ink-500">{preset.note}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FiltersTab() {
  const selected = useEditor((s) => s.selectedClip());
  const updateClip = useEditor((s) => s.updateClip);
  const commit = useEditor((s) => s.commit);

  const apply = (id: string) => {
    if (!selected) return;
    commit();
    updateClip(selected.id, { lut: id } as Partial<Clip>);
  };

  if (!selected || !isVisual(selected)) {
    return <Hint>Select a video, image, or title on the timeline to grade it.</Hint>;
  }

  return (
    <div className="p-3">
      {FILTER_GROUPS.map((group) => (
        <div key={group}>
          <SectionTitle>{group}</SectionTitle>
          <div className="grid grid-cols-3 gap-1.5">
            {FILTER_PRESETS.filter((f) => f.group === group).map((preset) => (
              <button
                key={preset.id}
                onClick={() => apply(preset.id)}
                className={cn(
                  "overflow-hidden rounded-md border transition",
                  selected.lut === preset.id
                    ? "border-blade-400 ring-1 ring-blade-400/40"
                    : "border-ink-700 hover:border-ink-500"
                )}
              >
                <FilterSwatch presetId={preset.id} />
                <span className="block truncate px-1 py-1 text-[9px] text-ink-300">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** A live thumbnail of what a preset does, built from a CSS gradient stand-in. */
function FilterSwatch({ presetId }: { presetId: string }) {
  const preset = FILTER_PRESETS.find((p) => p.id === presetId);
  const g = { ...defaultGrade(), ...(preset?.grade ?? {}) };
  const filter = [
    `brightness(${g.brightness})`,
    `contrast(${g.contrast})`,
    `saturate(${g.saturation})`,
    `hue-rotate(${g.hue}deg)`,
    `sepia(${g.sepia})`,
    `grayscale(${g.grayscale})`,
    `invert(${g.invert})`,
  ].join(" ");

  return (
    <span className="relative block aspect-[4/3] overflow-hidden">
      <span
        className="absolute inset-0"
        style={{
          filter,
          background:
            "linear-gradient(140deg,#F2A65A 0%,#C0543C 26%,#5E4E8C 55%,#1F3D6B 78%,#0E1A2E 100%)",
        }}
      />
      {preset?.tint && (
        <span
          className="absolute inset-0"
          style={{
            background: preset.tint.color,
            opacity: preset.tint.alpha,
            mixBlendMode: preset.tint.blend as React.CSSProperties["mixBlendMode"],
          }}
        />
      )}
      {g.vignette > 0 && (
        <span
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,${g.vignette}) 100%)`,
          }}
        />
      )}
    </span>
  );
}

function TransitionsTab() {
  const selected = useEditor((s) => s.selectedClip());
  const updateClip = useEditor((s) => s.updateClip);
  const commit = useEditor((s) => s.commit);

  if (!selected) return <Hint>Select the clip on the right side of a cut, then pick a transition.</Hint>;

  const groups = Array.from(new Set(TRANSITIONS.map((t) => t.group)));

  return (
    <div className="p-3">
      {groups.map((group) => (
        <div key={group}>
          <SectionTitle>{group}</SectionTitle>
          <div className="grid grid-cols-2 gap-1.5">
            {TRANSITIONS.filter((t) => t.group === group).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  commit();
                  updateClip(selected.id, {
                    transitionIn: { kind: t.id, duration: selected.transitionIn.duration || 0.5 },
                  } as Partial<Clip>);
                }}
                className={cn(
                  "rounded-md border px-2 py-2 text-left text-[11px] transition",
                  selected.transitionIn.kind === t.id
                    ? "border-blade-400 bg-blade-500/10 text-blade-200"
                    : "border-ink-700 bg-ink-850 text-ink-200 hover:border-ink-500"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <SectionTitle>Length</SectionTitle>
      <div className="px-3">
        <input
          type="range"
          min={0.1}
          max={3}
          step={0.05}
          value={selected.transitionIn.duration}
          onChange={(e) =>
            updateClip(selected.id, {
              transitionIn: { ...selected.transitionIn, duration: Number(e.target.value) },
            } as Partial<Clip>)
          }
          className="w-full"
        />
        <p className="mt-1 font-mono text-[10px] text-ink-400">
          {selected.transitionIn.duration.toFixed(2)}s
        </p>
      </div>
    </div>
  );
}

function MotionTab() {
  const selected = useEditor((s) => s.selectedClip());
  const updateClip = useEditor((s) => s.updateClip);
  const commit = useEditor((s) => s.commit);

  if (!selected) return <Hint>Select a clip to animate how it enters and leaves.</Hint>;

  return (
    <div className="p-3">
      <SectionTitle>Entrance</SectionTitle>
      <div className="grid grid-cols-2 gap-1.5">
        {ENTER_ANIMATIONS.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              commit();
              updateClip(selected.id, {
                animation: { ...selected.animation, enter: a.id },
              } as Partial<Clip>);
            }}
            className={cn(
              "rounded-md border px-2 py-2 text-left text-[11px] transition",
              selected.animation.enter === a.id
                ? "border-blade-400 bg-blade-500/10 text-blade-200"
                : "border-ink-700 bg-ink-850 text-ink-200 hover:border-ink-500"
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="mt-3 px-3">
        <RangeRow
          label="Entrance length"
          value={selected.animation.enterDuration}
          min={0.1}
          max={2}
          step={0.05}
          suffix="s"
          onChange={(v) =>
            updateClip(selected.id, {
              animation: { ...selected.animation, enterDuration: v },
            } as Partial<Clip>)
          }
        />
      </div>
    </div>
  );
}

function ShapesTab() {
  const addClip = useEditor((s) => s.addClip);
  const playhead = useEditor((s) => s.playhead);
  const tracks = useEditor((s) => s.tracks);

  const shapes: { id: "rect" | "ellipse" | "line"; label: string; fill: string }[] = [
    { id: "rect", label: "Rectangle", fill: "#FF7A2F" },
    { id: "ellipse", label: "Ellipse", fill: "#4A7FD4" },
    { id: "line", label: "Bar", fill: "#FFFFFF" },
  ];

  const insert = (shape: (typeof shapes)[number]) => {
    const track = tracks.find((t) => t.kind === "text");
    if (!track) return;
    addClip({
      id: uid("c"),
      trackId: track.id,
      start: playhead,
      duration: 3,
      type: "shape",
      shape: shape.id,
      fill: shape.fill,
      width: 420,
      height: 420,
      transform: { ...defaultTransform(), radius: shape.id === "rect" ? 24 : 0 },
      grade: defaultGrade(),
      animation: { ...defaultAnimation(), enter: "pop" },
      transitionIn: { kind: "none", duration: 0.5 },
      lut: "none",
      keying: defaultKeying(),
    });
  };

  return (
    <div className="p-3">
      <SectionTitle>Shapes</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        {shapes.map((s) => (
          <button
            key={s.id}
            onClick={() => insert(s)}
            className="grid aspect-square place-items-center rounded-lg border border-ink-700 bg-ink-850 transition hover:border-blade-500/50 hover:bg-ink-800"
            title={s.label}
          >
            <span
              className={cn(
                "block",
                s.id === "ellipse" ? "h-7 w-7 rounded-full" : s.id === "line" ? "h-1.5 w-8 rounded" : "h-7 w-7 rounded-md"
              )}
              style={{ background: s.fill }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 text-center">
      <p className="text-[11px] leading-relaxed text-ink-500">{children}</p>
    </div>
  );
}

export function RangeRow({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block py-1.5">
      <span className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] text-ink-300">{label}</span>
        <span className="font-mono text-[10px] tabular-nums text-ink-400">
          {value.toFixed(2)}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}
