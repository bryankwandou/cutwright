export type AssetKind = "video" | "audio" | "image";

export interface MediaAsset {
  id: string;
  name: string;
  kind: AssetKind;
  url: string;
  duration: number;
  width: number;
  height: number;
  /** Poster frame as a data URL, used for timeline thumbnails and the media bin. */
  thumbnail?: string;
}

export interface Transform {
  /** Offset from centre, as a fraction of canvas width/height. */
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  /** Mirrors the clip horizontally / vertically. */
  flipX: boolean;
  flipY: boolean;
  /** Corner radius in canvas pixels, applied as a clip mask. */
  radius: number;
}

export const defaultTransform = (): Transform => ({
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  opacity: 1,
  flipX: false,
  flipY: false,
  radius: 0,
});

export interface ColorGrade {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  sepia: number;
  grayscale: number;
  invert: number;
  /** Darkens the frame edges. Rendered as a radial overlay, not a CSS filter. */
  vignette: number;
}

export const defaultGrade = (): ColorGrade => ({
  brightness: 1,
  contrast: 1,
  saturation: 1,
  hue: 0,
  blur: 0,
  sepia: 0,
  grayscale: 0,
  invert: 0,
  vignette: 0,
});

export type TransitionKind =
  | "none"
  | "dissolve"
  | "dip-to-black"
  | "dip-to-white"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "wipe-left"
  | "wipe-right"
  | "circle-open"
  | "zoom-blur"
  | "glitch"
  | "push-left"
  | "whip-pan";

export interface Transition {
  kind: TransitionKind;
  /** Length of the overlap in seconds. */
  duration: number;
}

export type ClipAnimation =
  | "none"
  | "fade-in"
  | "fade-out"
  | "slide-up"
  | "slide-down"
  | "slide-left"
  | "slide-right"
  | "pop"
  | "zoom-in"
  | "zoom-out"
  | "typewriter"
  | "wipe-reveal"
  | "bounce"
  | "shake"
  | "spin-in";

export interface AnimationSpec {
  enter: ClipAnimation;
  exit: ClipAnimation;
  /** Seconds each side of the clip that the animation occupies. */
  enterDuration: number;
  exitDuration: number;
}

export const defaultAnimation = (): AnimationSpec => ({
  enter: "none",
  exit: "none",
  enterDuration: 0.4,
  exitDuration: 0.4,
});

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetY: number;
  backgroundColor: string;
  backgroundPadding: number;
  uppercase: boolean;
}

export const defaultTextStyle = (): TextStyle => ({
  fontFamily: "Inter",
  fontSize: 72,
  fontWeight: 700,
  color: "#FFFFFF",
  align: "center",
  letterSpacing: 0,
  lineHeight: 1.2,
  strokeColor: "#000000",
  strokeWidth: 0,
  shadowColor: "rgba(0,0,0,0.6)",
  shadowBlur: 0,
  shadowOffsetY: 0,
  backgroundColor: "transparent",
  backgroundPadding: 24,
  uppercase: false,
});

export type TrackKind = "video" | "audio" | "text" | "overlay";

export interface Track {
  id: string;
  kind: TrackKind;
  name: string;
  muted: boolean;
  hidden: boolean;
  locked: boolean;
  height: number;
}

interface ClipCommon {
  id: string;
  trackId: string;
  /** Position on the timeline, in seconds. */
  start: number;
  /** Length on the timeline, in seconds (after speed is applied). */
  duration: number;
  transform: Transform;
  grade: ColorGrade;
  animation: AnimationSpec;
  transitionIn: Transition;
  /** Preset id from lib/filters.ts, layered on top of the manual grade. */
  lut: string;
  /** Chroma key / background removal state. */
  keying: KeyingState;
}

export interface KeyingState {
  mode: "off" | "chroma" | "matte";
  /** Key colour for chroma mode. */
  color: string;
  similarity: number;
  smoothness: number;
  /** Object URL of a pre-computed alpha matte (from the background remover). */
  matteUrl?: string;
}

export const defaultKeying = (): KeyingState => ({
  mode: "off",
  color: "#00FF00",
  similarity: 0.4,
  smoothness: 0.1,
});

export interface MediaClip extends ClipCommon {
  type: "video" | "image" | "audio";
  assetId: string;
  /** Seconds into the source media where this clip begins. */
  trimIn: number;
  volume: number;
  speed: number;
  /** Fade lengths in seconds, audio only. */
  fadeIn: number;
  fadeOut: number;
}

export interface TextClip extends ClipCommon {
  type: "text";
  text: string;
  style: TextStyle;
}

export interface ShapeClip extends ClipCommon {
  type: "shape";
  shape: "rect" | "ellipse" | "line";
  fill: string;
  width: number;
  height: number;
}

export type Clip = MediaClip | TextClip | ShapeClip;

export const isMediaClip = (c: Clip): c is MediaClip =>
  c.type === "video" || c.type === "image" || c.type === "audio";
export const isTextClip = (c: Clip): c is TextClip => c.type === "text";
export const isShapeClip = (c: Clip): c is ShapeClip => c.type === "shape";
/** Clips that contribute pixels to the frame, as opposed to audio-only clips. */
export const isVisual = (c: Clip): boolean => c.type !== "audio";

export interface AspectPreset {
  id: string;
  label: string;
  width: number;
  height: number;
  note: string;
}

export const ASPECT_PRESETS: AspectPreset[] = [
  { id: "9:16", label: "9:16", width: 1080, height: 1920, note: "Reels, Shorts, TikTok" },
  { id: "16:9", label: "16:9", width: 1920, height: 1080, note: "YouTube, landscape" },
  { id: "1:1", label: "1:1", width: 1080, height: 1080, note: "Feed post" },
  { id: "4:5", label: "4:5", width: 1080, height: 1350, note: "Instagram portrait" },
  { id: "3:4", label: "3:4", width: 1080, height: 1440, note: "Portrait" },
  { id: "21:9", label: "21:9", width: 2560, height: 1080, note: "Cinemascope" },
];

export interface ProjectSettings {
  name: string;
  width: number;
  height: number;
  fps: number;
  background: string;
}
