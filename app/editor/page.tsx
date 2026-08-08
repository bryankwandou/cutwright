"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Keyboard, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { LibraryPanel } from "@/components/editor/LibraryPanel";
import { Preview } from "@/components/editor/Preview";
import { Timeline } from "@/components/editor/Timeline";
import { Inspector } from "@/components/editor/Inspector";
import { ExportDialog } from "@/components/editor/ExportDialog";
import { useEditor } from "@/lib/store";
import { probeFile } from "@/lib/media";

const SHORTCUTS: [string, string][] = [
  ["Space", "Play or pause"],
  ["S", "Split at playhead"],
  ["← →", "Step one frame"],
  ["Shift + ← →", "Step one second"],
  ["Home / End", "Jump to start or end"],
  ["Delete", "Remove selected clip"],
  ["Ctrl + D", "Duplicate selected clip"],
  ["Ctrl + Z", "Undo"],
  ["Ctrl + Shift + Z", "Redo"],
  ["Ctrl + E", "Open export"],
  ["Ctrl + Scroll", "Zoom the timeline"],
];

export default function EditorPage() {
  const [exportOpen, setExportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [dropping, setDropping] = useState(false);

  const projectName = useEditor((s) => s.settings.name);
  const clipCount = useEditor((s) => s.clips.length);
  const addAsset = useEditor((s) => s.addAsset);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Never hijack keys while the user is typing into a field.
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;

      const s = useEditor.getState();
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? s.redo() : s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (s.selectedClipId) s.duplicateClip(s.selectedClipId);
        return;
      }
      if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        setExportOpen(true);
        return;
      }
      if (mod) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          s.setPlaying(!s.playing);
          break;
        case "s":
        case "S":
          e.preventDefault();
          s.splitAtPlayhead();
          break;
        case "ArrowLeft":
          e.preventDefault();
          s.setPlaying(false);
          s.setPlayhead(s.playhead - (e.shiftKey ? 1 : 1 / s.settings.fps));
          break;
        case "ArrowRight":
          e.preventDefault();
          s.setPlaying(false);
          s.setPlayhead(Math.min(s.duration(), s.playhead + (e.shiftKey ? 1 : 1 / s.settings.fps)));
          break;
        case "Home":
          e.preventDefault();
          s.setPlayhead(0);
          break;
        case "End":
          e.preventDefault();
          s.setPlayhead(s.duration());
          break;
        case "Delete":
        case "Backspace":
          if (s.selectedClipId) {
            e.preventDefault();
            s.removeClip(s.selectedClipId);
          }
          break;
        case "?":
          setShortcutsOpen((v) => !v);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Files dropped anywhere in the window land in the library.
  useEffect(() => {
    const over = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      setDropping(true);
    };
    const leave = (e: DragEvent) => {
      if (e.relatedTarget) return;
      setDropping(false);
    };
    const drop = async (e: DragEvent) => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      setDropping(false);
      for (const file of Array.from(e.dataTransfer.files)) {
        const asset = await probeFile(file);
        if (asset) addAsset(asset);
      }
    };
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
    };
  }, [addAsset]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ink-950 text-ink-50">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-ink-700 bg-ink-900 px-3">
        <Link href="/" className="shrink-0" aria-label="Cutwright home">
          <Logo size={24} />
        </Link>

        <span className="h-4 w-px bg-ink-700" />

        <span className="min-w-0 flex-1 truncate text-xs text-ink-300">
          {projectName}
          <span className="ml-2 text-ink-600">
            {clipCount} {clipCount === 1 ? "clip" : "clips"}
          </span>
        </span>

        <button
          onClick={() => setShortcutsOpen(true)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-ink-400 transition hover:bg-ink-800 hover:text-ink-100"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard size={14} />
          Shortcuts
        </button>

        <button
          onClick={() => setExportOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-blade-500 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blade-400 active:scale-[0.98]"
        >
          <Download size={13} />
          Export
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-[320px] shrink-0 border-r border-ink-700">
          <LibraryPanel />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 bg-ink-950">
            <Preview />
          </div>
          <div className="h-[286px] shrink-0 border-t border-ink-700">
            <Timeline />
          </div>
        </main>

        <aside className="w-[272px] shrink-0 border-l border-ink-700">
          <Inspector />
        </aside>
      </div>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />

      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setShortcutsOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
        >
          <div className="w-full max-w-sm rounded-xl border border-ink-700 bg-ink-900 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Keyboard shortcuts</h2>
              <button
                onClick={() => setShortcutsOpen(false)}
                aria-label="Close"
                className="rounded p-1 text-ink-400 hover:bg-ink-800 hover:text-ink-100"
              >
                <X size={15} />
              </button>
            </div>
            <dl className="space-y-1.5">
              {SHORTCUTS.map(([key, action]) => (
                <div key={key} className="flex items-center justify-between gap-4 text-xs">
                  <dt className="text-ink-300">{action}</dt>
                  <dd>
                    <kbd className="rounded border border-ink-700 bg-ink-850 px-1.5 py-0.5 font-mono text-[10px] text-ink-200">
                      {key}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {dropping && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center border-4 border-blade-400 bg-blade-500/8">
          <p className="rounded-lg bg-ink-900 px-5 py-3 text-sm font-medium text-blade-200 shadow-xl">
            Release to add to your library
          </p>
        </div>
      )}
    </div>
  );
}
