import { AnimationSpec, TextStyle, Transform, defaultTextStyle } from "./types";

export interface TextPreset {
  id: string;
  label: string;
  note: string;
  sample: string;
  style: TextStyle;
  transform: Partial<Transform>;
  animation: Partial<AnimationSpec>;
}

const base = defaultTextStyle();

export const TEXT_PRESETS: TextPreset[] = [
  {
    id: "plain",
    label: "Plain",
    note: "Clean sans, no decoration",
    sample: "Your text here",
    style: { ...base },
    transform: {},
    animation: { enter: "fade-in", exit: "fade-out" },
  },
  {
    id: "caption",
    label: "Caption",
    note: "Bottom third, readable over anything",
    sample: "What you say goes here",
    style: {
      ...base,
      fontSize: 52,
      fontWeight: 600,
      strokeColor: "#000000",
      strokeWidth: 3,
      shadowBlur: 12,
      shadowOffsetY: 2,
    },
    transform: { y: 0.32 },
    animation: { enter: "slide-up", exit: "fade-out", enterDuration: 0.28 },
  },
  {
    id: "hook",
    label: "Hook",
    note: "Heavy, uppercase, top of frame",
    sample: "Watch this",
    style: {
      ...base,
      fontSize: 96,
      fontWeight: 900,
      uppercase: true,
      letterSpacing: -2,
      strokeColor: "#000000",
      strokeWidth: 5,
    },
    transform: { y: -0.28 },
    animation: { enter: "pop", exit: "zoom-out", enterDuration: 0.34 },
  },
  {
    id: "boxed",
    label: "Boxed",
    note: "Solid plate behind the words",
    sample: "Step one",
    style: {
      ...base,
      fontSize: 58,
      fontWeight: 700,
      color: "#08090B",
      backgroundColor: "#FF7A2F",
      backgroundPadding: 22,
    },
    transform: {},
    animation: { enter: "wipe-reveal", exit: "fade-out", enterDuration: 0.42 },
  },
  {
    id: "typed",
    label: "Typed",
    note: "Characters appear one at a time",
    sample: "typing this out…",
    style: { ...base, fontSize: 60, fontWeight: 500, fontFamily: "ui-monospace" },
    transform: {},
    animation: { enter: "typewriter", exit: "fade-out", enterDuration: 1.1 },
  },
  {
    id: "outline",
    label: "Outline",
    note: "Hollow letters, no fill",
    sample: "OUTLINE",
    style: {
      ...base,
      fontSize: 92,
      fontWeight: 900,
      uppercase: true,
      color: "transparent",
      strokeColor: "#FFFFFF",
      strokeWidth: 2.5,
      letterSpacing: 3,
    },
    transform: {},
    animation: { enter: "zoom-in", exit: "fade-out" },
  },
  {
    id: "lower-third",
    label: "Lower third",
    note: "Name and role, broadcast style",
    sample: "Bryan Kwandou\nEditor",
    style: {
      ...base,
      fontSize: 44,
      fontWeight: 600,
      align: "left",
      lineHeight: 1.35,
      shadowBlur: 10,
      shadowOffsetY: 2,
    },
    transform: { y: 0.3, x: -0.02 },
    animation: { enter: "slide-left", exit: "slide-right", enterDuration: 0.45 },
  },
  {
    id: "kicker",
    label: "Kicker",
    note: "Small, wide, all caps",
    sample: "chapter one",
    style: {
      ...base,
      fontSize: 34,
      fontWeight: 600,
      uppercase: true,
      letterSpacing: 9,
      color: "#FFB98D",
    },
    transform: { y: -0.34 },
    animation: { enter: "fade-in", exit: "fade-out", enterDuration: 0.6 },
  },
  {
    id: "impact",
    label: "Impact",
    note: "Shakes on entry",
    sample: "NO WAY",
    style: {
      ...base,
      fontSize: 110,
      fontWeight: 900,
      uppercase: true,
      letterSpacing: -3,
      color: "#FFFFFF",
      strokeColor: "#F2620F",
      strokeWidth: 6,
    },
    transform: {},
    animation: { enter: "shake", exit: "zoom-out", enterDuration: 0.5 },
  },
  {
    id: "credit",
    label: "End credit",
    note: "Quiet sign-off",
    sample: "thanks for watching",
    style: { ...base, fontSize: 46, fontWeight: 400, color: "#B6BCC4", letterSpacing: 1 },
    transform: {},
    animation: { enter: "fade-in", exit: "fade-out", enterDuration: 0.9, exitDuration: 0.9 },
  },
];
