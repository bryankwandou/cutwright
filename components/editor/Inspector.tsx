"use client";

import { useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  FlipHorizontal,
  FlipVertical,
  RotateCcw,
} from "lucide-react";
import { useEditor } from "@/lib/store";
import { RangeRow } from "./LibraryPanel";
import {
  ASPECT_PRESETS,
  Clip,
  ColorGrade,
  TextStyle,
  Transform,
  defaultGrade,
  defaultTransform,
  isMediaClip,
  isShapeClip,
  isTextClip,
} from "@/lib/types";
import { cn } from "@/lib/cn";

type Section = "transform" | "colour" | "text" | "audio" | "speed" | "project";

export function Inspector() {
  const selected = useEditor((s) => s.selectedClip());
  const updateClip = useEditor((s) => s.updateClip);
  const commit = useEditor((s) => s.commit);

  const patch = (p: Partial<Clip>) => selected && updateClip(selected.id, p);
  const patchTransform = (p: Partial<Transform>) =>
    selected && patch({ transform: { ...selected.transform, ...p } } as Partial<Clip>);
  const patchGrade = (p: Partial<ColorGrade>) =>
    selected && patch({ grade: { ...selected.grade, ...p } } as Partial<Clip>);

  if (!selected) return <ProjectPanel />;

  return (
    <div className="h-full overflow-y-auto bg-ink-900 pb-8">
      <div className="sticky top-0 z-10 border-b border-ink-700 bg-ink-900/95 px-3 py-2.5 backdrop-blur">
        <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-500">
          {selected.type} clip
        </p>
        <p className="mt-0.5 truncate text-xs text-ink-100">
          {isTextClip(selected)
            ? selected.text.slice(0, 34) || "Untitled"
            : isShapeClip(selected)
              ? selected.shape
              : (useEditor.getState().assetById((selected as { assetId: string }).assetId)?.name ?? "Clip")}
        </p>
      </div>

      {isTextClip(selected) && (
        <Group title="Content" defaultOpen>
          <textarea
            value={selected.text}
            onChange={(e) => patch({ text: e.target.value } as Partial<Clip>)}
            onBlur={commit}
            rows={3}
            className="w-full resize-y rounded-md border border-ink-700 bg-ink-950 px-2.5 py-2 text-xs text-ink-50 outline-none transition focus:border-blade-500"
            placeholder="Type your title"
          />
          <TextStyleControls
            style={selected.style}
            onChange={(p) => patch({ style: { ...selected.style, ...p } } as Partial<Clip>)}
          />
        </Group>
      )}

      {isShapeClip(selected) && (
        <Group title="Shape" defaultOpen>
          <Row label="Fill">
            <ColorInput value={selected.fill} onChange={(v) => patch({ fill: v } as Partial<Clip>)} />
          </Row>
          <RangeRow
            label="Width"
            value={selected.width}
            min={20}
            max={2200}
            step={2}
            onChange={(v) => patch({ width: v } as Partial<Clip>)}
          />
          <RangeRow
            label="Height"
            value={selected.height}
            min={20}
            max={2200}
            step={2}
            onChange={(v) => patch({ height: v } as Partial<Clip>)}
          />
        </Group>
      )}

      {selected.type !== "audio" && (
        <Group title="Transform" defaultOpen>
          <RangeRow
            label="Scale"
            value={selected.transform.scale}
            min={0.05}
            max={4}
            step={0.01}
            suffix="×"
            onChange={(v) => patchTransform({ scale: v })}
          />
          <RangeRow
            label="Position X"
            value={selected.transform.x}
            min={-1}
            max={1}
            step={0.005}
            onChange={(v) => patchTransform({ x: v })}
          />
          <RangeRow
            label="Position Y"
            value={selected.transform.y}
            min={-1}
            max={1}
            step={0.005}
            onChange={(v) => patchTransform({ y: v })}
          />
          <RangeRow
            label="Rotation"
            value={selected.transform.rotation}
            min={-180}
            max={180}
            step={1}
            suffix="°"
            onChange={(v) => patchTransform({ rotation: v })}
          />
          <RangeRow
            label="Opacity"
            value={selected.transform.opacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => patchTransform({ opacity: v })}
          />
          <RangeRow
            label="Corner radius"
            value={selected.transform.radius}
            min={0}
            max={400}
            step={2}
            onChange={(v) => patchTransform({ radius: v })}
          />

          <div className="mt-2 flex gap-1.5">
            <Toggle
              active={selected.transform.flipX}
              onClick={() => patchTransform({ flipX: !selected.transform.flipX })}
              label="Flip horizontally"
            >
              <FlipHorizontal size={13} /> Flip H
            </Toggle>
            <Toggle
              active={selected.transform.flipY}
              onClick={() => patchTransform({ flipY: !selected.transform.flipY })}
              label="Flip vertically"
            >
              <FlipVertical size={13} /> Flip V
            </Toggle>
            <Toggle
              active={false}
              onClick={() => {
                commit();
                patch({ transform: defaultTransform() } as Partial<Clip>);
              }}
              label="Reset transform"
            >
              <RotateCcw size={13} />
            </Toggle>
          </div>
        </Group>
      )}

      {selected.type !== "audio" && (
        <Group title="Colour">
          <RangeRow label="Brightness" value={selected.grade.brightness} min={0} max={2} step={0.01} onChange={(v) => patchGrade({ brightness: v })} />
          <RangeRow label="Contrast" value={selected.grade.contrast} min={0} max={2.5} step={0.01} onChange={(v) => patchGrade({ contrast: v })} />
          <RangeRow label="Saturation" value={selected.grade.saturation} min={0} max={3} step={0.01} onChange={(v) => patchGrade({ saturation: v })} />
          <RangeRow label="Hue" value={selected.grade.hue} min={-180} max={180} step={1} suffix="°" onChange={(v) => patchGrade({ hue: v })} />
          <RangeRow label="Blur" value={selected.grade.blur} min={0} max={24} step={0.1} suffix="px" onChange={(v) => patchGrade({ blur: v })} />
          <RangeRow label="Vignette" value={selected.grade.vignette} min={0} max={1} step={0.01} onChange={(v) => patchGrade({ vignette: v })} />
          <button
            onClick={() => {
              commit();
              patch({ grade: defaultGrade(), lut: "none" } as Partial<Clip>);
            }}
            className="mt-2 w-full rounded-md border border-ink-700 py-1.5 text-[11px] text-ink-300 transition hover:border-ink-600 hover:text-ink-100"
          >
            Reset colour
          </button>
        </Group>
      )}

      {isMediaClip(selected) && selected.type !== "image" && (
        <>
          <Group title="Speed">
            <RangeRow
              label="Playback rate"
              value={selected.speed}
              min={0.25}
              max={4}
              step={0.05}
              suffix="×"
              onChange={(v) => patch({ speed: v } as Partial<Clip>)}
            />
            <div className="mt-1 flex flex-wrap gap-1">
              {[0.5, 1, 1.5, 2, 3].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    commit();
                    patch({ speed: s } as Partial<Clip>);
                  }}
                  className={cn(
                    "rounded border px-2 py-1 font-mono text-[10px] transition",
                    Math.abs(selected.speed - s) < 0.001
                      ? "border-blade-400 bg-blade-500/10 text-blade-200"
                      : "border-ink-700 text-ink-300 hover:border-ink-500"
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </Group>

          <Group title="Audio">
            <RangeRow label="Volume" value={selected.volume} min={0} max={2} step={0.01} onChange={(v) => patch({ volume: v } as Partial<Clip>)} />
            <RangeRow label="Fade in" value={selected.fadeIn} min={0} max={5} step={0.05} suffix="s" onChange={(v) => patch({ fadeIn: v } as Partial<Clip>)} />
            <RangeRow label="Fade out" value={selected.fadeOut} min={0} max={5} step={0.05} suffix="s" onChange={(v) => patch({ fadeOut: v } as Partial<Clip>)} />
          </Group>
        </>
      )}

      <Group title="Timing">
        <Row label="Start">
          <NumberInput
            value={selected.start}
            step={0.05}
            onChange={(v) => patch({ start: Math.max(0, v) } as Partial<Clip>)}
          />
        </Row>
        <Row label="Length">
          <NumberInput
            value={selected.duration}
            step={0.05}
            onChange={(v) => patch({ duration: Math.max(0.1, v) } as Partial<Clip>)}
          />
        </Row>
      </Group>
    </div>
  );
}

function TextStyleControls({
  style,
  onChange,
}: {
  style: TextStyle;
  onChange: (p: Partial<TextStyle>) => void;
}) {
  const fonts = ["Inter", "Georgia", "ui-monospace", "Impact", "Verdana", "Times New Roman"];
  return (
    <>
      <Row label="Font">
        <select
          value={style.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
          className="w-full rounded border border-ink-700 bg-ink-950 px-2 py-1 text-[11px] text-ink-100 outline-none focus:border-blade-500"
        >
          {fonts.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Align">
        <div className="flex gap-1">
          {([
            ["left", AlignLeft],
            ["center", AlignCenter],
            ["right", AlignRight],
          ] as const).map(([id, Icon]) => (
            <button
              key={id}
              onClick={() => onChange({ align: id })}
              aria-label={`Align ${id}`}
              className={cn(
                "flex h-7 flex-1 items-center justify-center rounded border transition",
                style.align === id
                  ? "border-blade-400 bg-blade-500/10 text-blade-200"
                  : "border-ink-700 text-ink-400 hover:border-ink-500"
              )}
            >
              <Icon size={13} />
            </button>
          ))}
        </div>
      </Row>

      <RangeRow label="Size" value={style.fontSize} min={12} max={260} step={1} onChange={(v) => onChange({ fontSize: v })} />
      <RangeRow label="Weight" value={style.fontWeight} min={100} max={900} step={100} onChange={(v) => onChange({ fontWeight: v })} />
      <RangeRow label="Letter spacing" value={style.letterSpacing} min={-10} max={30} step={0.5} onChange={(v) => onChange({ letterSpacing: v })} />
      <RangeRow label="Line height" value={style.lineHeight} min={0.8} max={2.4} step={0.05} onChange={(v) => onChange({ lineHeight: v })} />
      <RangeRow label="Outline" value={style.strokeWidth} min={0} max={16} step={0.5} onChange={(v) => onChange({ strokeWidth: v })} />
      <RangeRow label="Shadow" value={style.shadowBlur} min={0} max={40} step={1} onChange={(v) => onChange({ shadowBlur: v })} />

      <Row label="Colour">
        <ColorInput value={style.color} onChange={(v) => onChange({ color: v })} />
      </Row>
      <Row label="Outline colour">
        <ColorInput value={style.strokeColor} onChange={(v) => onChange({ strokeColor: v })} />
      </Row>

      <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-[11px] text-ink-300">
        <input
          type="checkbox"
          checked={style.uppercase}
          onChange={(e) => onChange({ uppercase: e.target.checked })}
          className="accent-blade-500"
        />
        All caps
      </label>
    </>
  );
}

function ProjectPanel() {
  const settings = useEditor((s) => s.settings);
  const updateSettings = useEditor((s) => s.updateSettings);

  return (
    <div className="h-full overflow-y-auto bg-ink-900">
      <div className="border-b border-ink-700 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-500">Project</p>
        <p className="mt-0.5 text-xs text-ink-400">Nothing selected — showing project settings</p>
      </div>

      <Group title="Canvas" defaultOpen>
        <input
          value={settings.name}
          onChange={(e) => updateSettings({ name: e.target.value })}
          className="mb-3 w-full rounded-md border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-xs text-ink-50 outline-none focus:border-blade-500"
          aria-label="Project name"
        />
        <div className="grid grid-cols-3 gap-1.5">
          {ASPECT_PRESETS.map((p) => {
            const active = settings.width === p.width && settings.height === p.height;
            return (
              <button
                key={p.id}
                onClick={() => updateSettings({ width: p.width, height: p.height })}
                title={p.note}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-md border py-2 transition",
                  active
                    ? "border-blade-400 bg-blade-500/10"
                    : "border-ink-700 hover:border-ink-500"
                )}
              >
                <span
                  className={cn("block border", active ? "border-blade-300" : "border-ink-400")}
                  style={{
                    width: p.width >= p.height ? 22 : (22 * p.width) / p.height,
                    height: p.width >= p.height ? (22 * p.height) / p.width : 22,
                  }}
                />
                <span className={cn("font-mono text-[9px]", active ? "text-blade-200" : "text-ink-400")}>
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Playback">
        <Row label="Frame rate">
          <div className="flex gap-1">
            {[24, 25, 30, 60].map((f) => (
              <button
                key={f}
                onClick={() => updateSettings({ fps: f })}
                className={cn(
                  "flex-1 rounded border py-1 font-mono text-[10px] transition",
                  settings.fps === f
                    ? "border-blade-400 bg-blade-500/10 text-blade-200"
                    : "border-ink-700 text-ink-300 hover:border-ink-500"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Background">
          <ColorInput value={settings.background} onChange={(v) => updateSettings({ background: v })} />
        </Row>
      </Group>
    </div>
  );
}

function Group({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <section className="border-b border-ink-800">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-ink-850"
      >
        <span className="text-[11px] font-semibold text-ink-100">{title}</span>
        <span className={cn("text-ink-500 transition-transform", open && "rotate-90")}>›</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-[11px] text-ink-300">{label}</span>
      {children}
    </label>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className="flex items-center gap-2">
      <input
        type="color"
        value={value.startsWith("#") ? value : "#ffffff"}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 cursor-pointer rounded border border-ink-700 bg-transparent"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 rounded border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-[10px] text-ink-200 outline-none focus:border-blade-500"
      />
    </span>
  );
}

function NumberInput({
  value,
  step,
  onChange,
}: {
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={Number(value.toFixed(2))}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-[11px] text-ink-100 outline-none focus:border-blade-500"
    />
  );
}

function Toggle({
  children,
  active,
  onClick,
  label,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "flex flex-1 items-center justify-center gap-1 rounded-md border py-1.5 text-[10px] transition",
        active
          ? "border-blade-400 bg-blade-500/10 text-blade-200"
          : "border-ink-700 text-ink-300 hover:border-ink-500"
      )}
    >
      {children}
    </button>
  );
}
