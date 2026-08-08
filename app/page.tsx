import Link from "next/link";
import {
  ArrowRight,
  Blend,
  Github,
  Layers,
  MonitorSmartphone,
  Scissors,
  ShieldCheck,
  Sparkles,
  Type,
  WifiOff,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { TransitionShowcase } from "@/components/landing/TransitionShowcase";
import { FilterLab } from "@/components/landing/FilterLab";

const FEATURES = [
  {
    icon: Scissors,
    title: "A timeline that behaves",
    body: "Multiple tracks, ripple-free dragging, edge trimming, and a razor bound to the S key. Clip edges snap to each other and to the playhead, and every edit goes on an undo stack fifty steps deep.",
  },
  {
    icon: Blend,
    title: "Fifteen transitions",
    body: "Dissolve, dip to black or white, four directional slides, push, whip pan, two wipes, circle open, zoom blur, and a glitch that tears the frame into slices. Length is adjustable per cut.",
  },
  {
    icon: Sparkles,
    title: "Twenty-six looks",
    body: "Cinematic, retro, monochrome, and stylised grades, plus manual control over brightness, contrast, saturation, hue, blur, and vignette. Presets and manual grades stack.",
  },
  {
    icon: Type,
    title: "Titles with motion",
    body: "Ten title styles from broadcast lower thirds to heavy social hooks. Fourteen entrance curves, including a genuine per-character typewriter and a decaying shake.",
  },
  {
    icon: Layers,
    title: "Six aspect ratios",
    body: "Portrait for Reels and Shorts, square for feeds, widescreen for long form, and 21:9 when you want the letterbox. Switching ratio re-composes the canvas without touching your clips.",
  },
  {
    icon: MonitorSmartphone,
    title: "Android is next",
    body: "The compositor is plain canvas code with no desktop-only dependencies, so the same engine can be wrapped for mobile. That work has not started yet — it is on the roadmap, not in the build.",
  },
];

const COMPARISON = [
  ["Watermark on export", "Free tier stamps the frame", "Never"],
  ["Where your footage goes", "Uploaded to a server", "Stays on your disk"],
  ["Account required", "Yes, before you can export", "No sign-up at all"],
  ["Works without a connection", "No", "Yes, once the page is cached"],
  ["Export resolution", "Capped until you pay", "Whatever your machine can encode"],
  ["Cost", "Monthly", "None"],
];

const FAQ = [
  {
    q: "Where does my footage actually go?",
    a: "Nowhere. Files are read through the browser's File API into an object URL that only this tab can see. There is no upload endpoint in the codebase — you can check the network tab while you edit and watch it stay empty.",
  },
  {
    q: "How does it write an MP4 without a server?",
    a: "Through WebCodecs, the browser API that exposes the same hardware encoder your operating system uses. Frames are drawn to a canvas, handed to a VideoEncoder, and packed into a container by Mediabunny. Roughly 95 percent of browsers in use today support it.",
  },
  {
    q: "Which browsers can export?",
    a: "Chrome 94 and up, Edge 94 and up, Firefox 130 and up, and Safari 26 and up. Older browsers can still cut and preview; only the render step needs WebCodecs.",
  },
  {
    q: "Is this a CapCut clone?",
    a: "No. It covers a lot of the same ground because that is what editing software does, but nothing is copied, decompiled, or patched. The compositor, timeline, and export path were written from scratch and the source is public.",
  },
  {
    q: "What is missing right now?",
    a: "Speed ramping, motion keyframes between arbitrary points, audio waveform analysis from real peaks, background removal, and the Android wrapper. The honest list is in the README rather than buried.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-ink-950 text-ink-50">
      <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
          <Logo size={26} />
          <nav className="ml-auto hidden items-center gap-6 text-[13px] text-ink-300 sm:flex">
            <a href="#capabilities" className="transition hover:text-ink-50">
              Capabilities
            </a>
            <a href="#looks" className="transition hover:text-ink-50">
              Looks
            </a>
            <a href="#privacy" className="transition hover:text-ink-50">
              Privacy
            </a>
            <a href="#faq" className="transition hover:text-ink-50">
              FAQ
            </a>
          </nav>
          <Link
            href="/editor"
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-blade-500 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-blade-400 active:scale-[0.98] sm:ml-0"
          >
            Open the editor
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="grain relative overflow-hidden border-b border-ink-800">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-16rem] h-[34rem] w-[64rem] -translate-x-1/2 rounded-full opacity-[0.16] blur-[120px]"
            style={{ background: "radial-gradient(circle, #FF7A2F 0%, transparent 68%)" }}
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:py-28">
            <div className="animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-3 py-1 text-[11px] text-ink-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blade-400" />
                Runs on your machine, not ours
              </span>

              <h1 className="mt-5 text-[2.6rem] font-bold leading-[1.04] tracking-[-0.03em] sm:text-6xl">
                Edit video in a
                <br />
                browser tab.
                <br />
                <span className="text-blade-400">Keep the frame clean.</span>
              </h1>

              <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-ink-300">
                Cutwright cuts, grades, titles, and encodes video without sending a single byte
                anywhere. No stamp burned into the corner, no account wall in front of the export
                button, and no monthly charge for a resolution your laptop was always able to
                produce.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/editor"
                  className="group flex items-center gap-2 rounded-xl bg-blade-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blade-400 active:scale-[0.98]"
                >
                  Start cutting
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="https://github.com/bryankwandou/cutwright"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-ink-700 px-5 py-3 text-sm text-ink-200 transition hover:border-ink-600 hover:text-ink-50"
                >
                  <Github size={15} />
                  Read the source
                </a>
              </div>

              <dl className="mt-10 grid max-w-md grid-cols-3 gap-5 border-t border-ink-800 pt-6">
                {[
                  ["26", "colour looks"],
                  ["15", "transitions"],
                  ["14", "motion curves"],
                ].map(([n, l]) => (
                  <div key={l}>
                    <dt className="font-mono text-2xl tabular-nums text-ink-50">{n}</dt>
                    <dd className="mt-0.5 text-[11px] text-ink-500">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="animate-rise [animation-delay:120ms]">
              <TransitionShowcase />
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" className="border-b border-ink-800 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <SectionHead
              kicker="What is in the build"
              title="The parts that actually work today"
              body="Everything listed here is implemented and runs in the editor right now. The roadmap sits further down the page, kept separate on purpose."
            />

            <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-ink-800 bg-ink-800 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <article
                  key={title}
                  className="group relative bg-ink-950 p-6 transition-colors hover:bg-ink-900"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-700 bg-ink-900 text-blade-400 transition group-hover:border-blade-500/40">
                    <Icon size={16} />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-400">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Looks */}
        <section id="looks" className="border-b border-ink-800 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <SectionHead
              kicker="Colour"
              title="Grade it, then see it move"
              body="Click any swatch. The frame beside it is redrawn through the same grading code the editor and the encoder both call, so the preview is not an approximation."
            />
            <div className="mt-12">
              <FilterLab />
            </div>
          </div>
        </section>

        {/* Privacy / comparison */}
        <section id="privacy" className="border-b border-ink-800 py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <SectionHead
                  kicker="Privacy"
                  title="Nothing to upload means nothing to leak"
                  body="Browser editors normally push your footage to a render farm. Cutwright does not have one. Your files are opened locally, composited locally, and encoded by the chip already sitting in your machine."
                  align="left"
                />
                <ul className="mt-7 space-y-3">
                  {[
                    [ShieldCheck, "No upload endpoint exists in the codebase"],
                    [WifiOff, "Editing continues with the network disconnected"],
                    [Github, "Source is public, so the claim is checkable"],
                  ].map(([Icon, text]) => {
                    const I = Icon as typeof ShieldCheck;
                    return (
                      <li key={text as string} className="flex items-start gap-3 text-[13px] text-ink-300">
                        <I size={15} className="mt-0.5 shrink-0 text-blade-400" />
                        {text as string}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="overflow-hidden rounded-xl border border-ink-800">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-ink-800 bg-ink-900">
                      <th className="px-4 py-3 text-left font-medium text-ink-400"> </th>
                      <th className="px-4 py-3 text-left font-medium text-ink-400">Typical web editor</th>
                      <th className="px-4 py-3 text-left font-medium text-blade-300">Cutwright</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map(([label, them, us]) => (
                      <tr key={label} className="border-b border-ink-800/70 last:border-0">
                        <td className="px-4 py-3 text-ink-300">{label}</td>
                        <td className="px-4 py-3 text-ink-500">{them}</td>
                        <td className="px-4 py-3 font-medium text-ink-100">{us}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-b border-ink-800 py-20">
          <div className="mx-auto max-w-3xl px-5">
            <SectionHead kicker="Questions" title="Straight answers" />
            <div className="mt-10 divide-y divide-ink-800 border-y border-ink-800">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink-100 transition hover:text-white">
                    {q}
                    <span className="shrink-0 text-ink-500 transition-transform duration-200 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[13px] leading-relaxed text-ink-400">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="grain relative overflow-hidden py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.14] blur-[110px]"
            style={{ background: "radial-gradient(circle, #FF7A2F 0%, transparent 70%)" }}
          />
          <div className="relative mx-auto max-w-2xl px-5 text-center">
            <LogoMark size={44} className="mx-auto" />
            <h2 className="mt-6 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
              Open a tab. Drop a file. Cut.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink-400">
              There is no onboarding, no trial counter, and no card to enter. The editor is one click
              from here.
            </p>
            <Link
              href="/editor"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-blade-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blade-400 active:scale-[0.98]"
            >
              Open the editor
              <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-800 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-[12px] text-ink-500 sm:flex-row">
          <Logo size={20} />
          <p>Built in the open. Encoding happens on your device.</p>
          <a
            href="https://github.com/bryankwandou/cutwright"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition hover:text-ink-200"
          >
            <Github size={13} />
            Source
          </a>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({
  kicker,
  title,
  body,
  align = "center",
}: {
  kicker: string;
  title: string;
  body?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blade-400">{kicker}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-[-0.025em] sm:text-[2.4rem]">{title}</h2>
      {body && <p className="mt-4 text-[14px] leading-relaxed text-ink-400">{body}</p>}
    </div>
  );
}
