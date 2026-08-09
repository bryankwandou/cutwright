# Cutwright — brand reference

The source of truth for colour, type, and voice. Tokens live in
[`app/globals.css`](app/globals.css); this file explains why they are what they are.

## The name

*Cutwright*, from the `-wright` suffix that survives in shipwright, playwright,
wheelwright, and cartwright — a person who builds something by hand. It pairs the
single most common verb in editing with a word that means craft rather than automation.
That reading matters, because the product's argument is that a person with a laptop can
do the work a render farm used to charge for.

Practical checks it passes: two syllables, spells itself when spoken aloud, no ambiguous
letters, no collision with an existing tool, and free on GitHub, npm, and vercel.app at
the time of registration. It also sidesteps the naming trap most editors fall into —
`-ify`, `-ly`, `Vid-`, `Clip-`, and `Reel-` are exhausted categories where nothing is
memorable because everything sounds alike.

## The mark

One film frame, sliced on a shallow diagonal, the two halves pulled slightly apart along
the cut's normal. Sprocket perforations sit at the top and bottom edges.

The reasoning: the cut *is* the product. Most editor logos reach for a camera, a play
triangle, or a clapperboard — none of which describe editing, all of which are crowded.
A frame that has visibly been cut is specific to this category and is not currently in
use by anyone.

It survives shrinking because the silhouette stays a single rounded square; the diagonal
is a high-contrast break rather than fine detail. `LogoMark` takes a `split` prop —
set it `false` in dense UI chrome, where the offset halves start to read as
misalignment rather than intent.

Gradient runs `#FF9557 → #F2620F` on the upper half and `#D94E14 → #7A2A06` on the
lower, so the two pieces read as the same object under one light source rather than as
two unrelated shapes.

## Colour

A neutral scale plus exactly one accent. That restraint is the whole system: when only
one hue is saturated, that hue reliably means *this is the thing you act on*. Editors
that colour every panel differently make the interface compete with the footage.

**Ink** — `#08090B` through `#F4F5F7`. Thirteen steps, dark-first, because colour
grading against a light chrome is a losing fight.

**Blade** — `#FF7A2F` at rest, `#F2620F` for fills, `#FF9557` and `#FFB98D` for text on
dark. Warm rather than the default product-blue, and close enough to a heat-treated edge
to sit under the name without being literal about it.

**Track identity** — video `#4A7FD4`, audio `#3FA88A`, text `#A273D6`, overlay `#D4A03F`.
Deliberately desaturated and used at roughly 30% opacity behind clips, so the timeline
reads as one surface with hue as a secondary cue.

## Type

Inter throughout, loaded via `next/font`. Display sizes run tight (`-0.03em` at hero
scale, `-0.025em` at section headings); UI text sits at 11–13px with normal tracking.
Numbers in the timecode, the ruler, and any stat use tabular figures so they stop
jittering during playback.

## Motion

Two curves. `--ease-out-quint` for anything entering or resizing; `--ease-spring` for
controls that should feel like they have mass. Durations sit between 120ms and 620ms —
below 120ms nothing registers, above 620ms an editing tool starts to feel slow.

Everything collapses under `prefers-reduced-motion`, including the landing page's
looping canvas demo.

## Voice

Plain, specific, and checkable. The product's claim is a factual one — nothing is
uploaded — so the copy earns trust by being verifiable rather than enthusiastic.

Write: "There is no upload endpoint in the codebase — watch the network tab stay empty."
Not: "Your privacy matters to us."

Concrete rules the copy follows:

- Count things. "Fifteen transitions" beats "a rich library of transitions".
- Name the limitation before someone finds it. The README's "what does not work yet"
  section is a feature, not an apology.
- No exclamation marks, no emoji, no second-person cheerleading.
- Avoid the vocabulary that signals machine-written marketing: *seamless*, *unleash*,
  *elevate*, *empower*, *revolutionise*, *game-changer*, *dive in*, *unlock*.
- Prefer the verb to the abstraction — "cut", "grade", "encode" over "content creation
  workflows".
