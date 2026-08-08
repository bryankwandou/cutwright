import { ColorGrade } from "./types";

export interface FilterPreset {
  id: string;
  label: string;
  group: string;
  grade: Partial<ColorGrade>;
  /** Optional colour wash painted over the frame after the CSS filter pass. */
  tint?: { color: string; alpha: number; blend: GlobalCompositeOperation };
}

/**
 * Looks are expressed as a base grade plus an optional tint layer. Keeping them
 * declarative means the same preset drives the preview canvas and the export
 * worker without a second implementation.
 */
export const FILTER_PRESETS: FilterPreset[] = [
  { id: "none", label: "Original", group: "Basic", grade: {} },

  { id: "vivid", label: "Vivid", group: "Basic", grade: { saturation: 1.45, contrast: 1.12 } },
  { id: "punch", label: "Punch", group: "Basic", grade: { contrast: 1.3, saturation: 1.2, brightness: 1.03 } },
  { id: "soft", label: "Soft", group: "Basic", grade: { contrast: 0.9, brightness: 1.06, saturation: 0.95 } },
  { id: "matte", label: "Matte", group: "Basic", grade: { contrast: 0.85, brightness: 1.04 }, tint: { color: "#2A2A35", alpha: 0.12, blend: "lighten" } },

  { id: "mono", label: "Mono", group: "Monochrome", grade: { grayscale: 1, contrast: 1.15 } },
  { id: "noir", label: "Noir", group: "Monochrome", grade: { grayscale: 1, contrast: 1.5, brightness: 0.94, vignette: 0.45 } },
  { id: "silver", label: "Silver", group: "Monochrome", grade: { grayscale: 1, contrast: 0.92, brightness: 1.1 } },

  { id: "warm", label: "Warm", group: "Temperature", grade: { saturation: 1.1 }, tint: { color: "#FF9A3C", alpha: 0.14, blend: "overlay" } },
  { id: "cool", label: "Cool", group: "Temperature", grade: { saturation: 1.05 }, tint: { color: "#3C7DFF", alpha: 0.14, blend: "overlay" } },
  { id: "golden", label: "Golden hour", group: "Temperature", grade: { brightness: 1.06, saturation: 1.2 }, tint: { color: "#FFB35C", alpha: 0.22, blend: "soft-light" } },
  { id: "arctic", label: "Arctic", group: "Temperature", grade: { brightness: 1.05, saturation: 0.85 }, tint: { color: "#9BD6FF", alpha: 0.18, blend: "soft-light" } },

  { id: "film", label: "Film", group: "Cinematic", grade: { contrast: 1.18, saturation: 0.92, vignette: 0.25 }, tint: { color: "#1E2A18", alpha: 0.1, blend: "soft-light" } },
  { id: "teal-orange", label: "Teal & orange", group: "Cinematic", grade: { contrast: 1.22, saturation: 1.15 }, tint: { color: "#0E5A6B", alpha: 0.2, blend: "soft-light" } },
  { id: "bleach", label: "Bleach bypass", group: "Cinematic", grade: { saturation: 0.4, contrast: 1.45, brightness: 1.05 } },
  { id: "noir-blue", label: "Midnight", group: "Cinematic", grade: { brightness: 0.9, contrast: 1.25, saturation: 0.8, vignette: 0.35 }, tint: { color: "#0A1A3C", alpha: 0.3, blend: "soft-light" } },
  { id: "dusk", label: "Dusk", group: "Cinematic", grade: { brightness: 0.96, contrast: 1.1 }, tint: { color: "#6B3C8C", alpha: 0.2, blend: "soft-light" } },

  { id: "vintage", label: "Vintage", group: "Retro", grade: { sepia: 0.4, contrast: 1.05, saturation: 0.9, vignette: 0.3 } },
  { id: "70s", label: "Super 8", group: "Retro", grade: { sepia: 0.28, saturation: 1.25, contrast: 1.1, vignette: 0.4 }, tint: { color: "#C97A2E", alpha: 0.16, blend: "soft-light" } },
  { id: "faded", label: "Faded", group: "Retro", grade: { contrast: 0.8, saturation: 0.75, brightness: 1.1 }, tint: { color: "#D9C8B4", alpha: 0.18, blend: "lighten" } },
  { id: "polaroid", label: "Polaroid", group: "Retro", grade: { sepia: 0.2, brightness: 1.08, contrast: 0.9, saturation: 1.1 } },

  { id: "neon", label: "Neon", group: "Stylised", grade: { saturation: 1.7, contrast: 1.3 }, tint: { color: "#FF2D95", alpha: 0.16, blend: "overlay" } },
  { id: "cyberpunk", label: "Cyberpunk", group: "Stylised", grade: { saturation: 1.5, contrast: 1.35, brightness: 0.96 }, tint: { color: "#00E5FF", alpha: 0.18, blend: "overlay" } },
  { id: "infrared", label: "Infrared", group: "Stylised", grade: { hue: 150, saturation: 1.6, contrast: 1.2 } },
  { id: "invert", label: "Negative", group: "Stylised", grade: { invert: 1 } },
  { id: "dream", label: "Dream", group: "Stylised", grade: { blur: 1.5, brightness: 1.08, saturation: 1.15, contrast: 0.92 } },
];

export const FILTER_GROUPS = Array.from(new Set(FILTER_PRESETS.map((f) => f.group)));

export const findPreset = (id: string) => FILTER_PRESETS.find((f) => f.id === id);

/** Merges the manual grade with a preset, preset values taking precedence. */
export function resolveGrade(grade: ColorGrade, lutId: string): ColorGrade {
  const preset = findPreset(lutId);
  if (!preset || preset.id === "none") return grade;
  return { ...grade, ...preset.grade } as ColorGrade;
}

/**
 * Builds a canvas `ctx.filter` string. Values at their neutral point are
 * omitted so the browser can skip the filter pass entirely when nothing is set.
 */
export function gradeToCssFilter(g: ColorGrade): string {
  const parts: string[] = [];
  if (g.brightness !== 1) parts.push(`brightness(${g.brightness})`);
  if (g.contrast !== 1) parts.push(`contrast(${g.contrast})`);
  if (g.saturation !== 1) parts.push(`saturate(${g.saturation})`);
  if (g.hue !== 0) parts.push(`hue-rotate(${g.hue}deg)`);
  if (g.blur > 0) parts.push(`blur(${g.blur}px)`);
  if (g.sepia > 0) parts.push(`sepia(${g.sepia})`);
  if (g.grayscale > 0) parts.push(`grayscale(${g.grayscale})`);
  if (g.invert > 0) parts.push(`invert(${g.invert})`);
  return parts.length ? parts.join(" ") : "none";
}
