# Cutwright

A video editor that runs entirely inside a browser tab. Cut, grade, title, and encode
without uploading anything, without an account, and without a watermark burned into
the corner of the result.

> *wright* — one who makes by hand: shipwright, playwright, wheelwright.

## Why this exists

Every free browser-based editor eventually asks for the same two things: your footage
on their server, and a subscription before the export drops the watermark. Neither is a
technical requirement any more. Browsers ship a hardware video encoder behind the
WebCodecs API, which means the machine already on your desk can do the work that used
to justify a render farm.

Cutwright has no upload endpoint. Files are opened through the File API, composited on a
canvas, and handed to the operating system's encoder. You can watch the network tab stay
empty while you edit.

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>. The editor lives at `/editor`.

## What works today

**Timeline**
Multiple tracks with per-track mute, hide, and lock. Drag clips between compatible
tracks, trim from either edge, split at the playhead, duplicate, and delete. Clip edges
snap to other clips and to the playhead. Fifty levels of undo.

**Colour** — 26 presets across cinematic, retro, monochrome, temperature, and stylised
groups, plus manual control of brightness, contrast, saturation, hue, blur, and vignette.
Presets and manual grades compose rather than override each other.

**Transitions** — 15 of them: dissolve, dip to black, dip to white, four directional
slides, push, whip pan, two wipes, circle open, zoom blur, and a slice-tearing glitch.
Each one has an adjustable length and is centred on the cut.

**Titles** — 10 styles from broadcast lower thirds to heavy social hooks, with control
over font, weight, size, tracking, leading, outline, shadow, plate colour, and case.

**Motion** — 14 entrance and exit curves including a real per-character typewriter, a
decaying shake, and a spring-backed pop.

**Canvas** — six aspect ratios (9:16, 16:9, 1:1, 4:5, 3:4, 21:9) at 24, 25, 30, or 60 fps.

**Export** — MP4 or WebM at four quality levels and three resolution scales, with the
audio bed mixed through an `OfflineAudioContext` so per-clip volume, speed, and fades
land in the file.

## What does not work yet

Kept separate from the list above on purpose.

- Speed ramping (variable rate across a single clip)
- Keyframes between arbitrary points — animation is entrance/exit only
- Audio waveforms drawn from real peaks; the timeline currently shows a placeholder
- Chroma key and background removal — the state model is wired, the shader is not
- Project save/load; closing the tab loses the edit
- The Android wrapper

## How it fits together

```
lib/types.ts        Data model for clips, tracks, grades, transforms
lib/store.ts        Zustand store with an undo/redo snapshot stack
lib/compositor.ts   Draws one frame at time t — the single source of truth
lib/transitions.ts  Blend functions, given two draw callbacks
lib/animations.ts   Entrance/exit curves returning a per-frame offset
lib/filters.ts      Grade presets and the canvas filter string builder
lib/export.ts       Decode via CanvasSink, encode via WebCodecs, mux via Mediabunny
```

The preview and the exporter both call `renderFrame`. They differ only in where pixels
come from: the preview reads live `<video>` elements, the exporter pulls frame-exact
samples from a decoder. That is why what you see matches what you get.

## Browser support

Editing works anywhere modern. Exporting needs WebCodecs:

| Browser | Minimum |
| --- | --- |
| Chrome | 94 |
| Edge | 94 |
| Firefox | 130 |
| Safari | 26 |

## Built with

[Next.js](https://nextjs.org) · [Mediabunny](https://mediabunny.dev) (MPL-2.0) ·
[Zustand](https://zustand-demo.pmnd.rs) · [Tailwind CSS](https://tailwindcss.com) ·
[Lucide](https://lucide.dev)

## On the CapCut comparison

Cutwright covers overlapping ground because that is what editing software does. Nothing
here is decompiled, patched, or lifted from another product. The compositor, timeline,
and export path were written from scratch, and the source is public so the claim is
verifiable.

## Licence

MIT
