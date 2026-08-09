"use client";

import { Clip, MediaAsset, ProjectSettings, Track } from "./types";

/**
 * Autosave lives in IndexedDB rather than localStorage because the media
 * itself is stored alongside the edit. Object URLs die with the tab, so on
 * restore we re-issue them from the saved blobs — that is what makes reopening
 * a project actually work instead of restoring a timeline full of dead clips.
 */

const DB_NAME = "cutwright";
const DB_VERSION = 1;
const STORE_PROJECT = "project";
const STORE_FILES = "files";
const PROJECT_KEY = "current";

export interface SavedProject {
  savedAt: number;
  settings: ProjectSettings;
  tracks: Track[];
  clips: Clip[];
  /** Asset records without the object URL, which is regenerated on load. */
  assets: Omit<MediaAsset, "url">[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECT)) db.createObjectStore(STORE_PROJECT);
      if (!db.objectStoreNames.contains(STORE_FILES)) db.createObjectStore(STORE_FILES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const req = run(t.objectStore(store));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAssetBlob(assetId: string, file: Blob) {
  try {
    const db = await openDb();
    await tx(db, STORE_FILES, "readwrite", (s) => s.put(file, assetId));
    db.close();
  } catch {
    // Storage may be full or blocked in private mode. Losing autosave is not
    // worth interrupting an edit over.
  }
}

export async function saveProject(data: {
  settings: ProjectSettings;
  tracks: Track[];
  clips: Clip[];
  assets: MediaAsset[];
}) {
  try {
    const db = await openDb();
    const payload: SavedProject = {
      savedAt: Date.now(),
      settings: data.settings,
      tracks: data.tracks,
      clips: data.clips,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      assets: data.assets.map(({ url, ...rest }) => rest),
    };
    await tx(db, STORE_PROJECT, "readwrite", (s) => s.put(payload, PROJECT_KEY));
    db.close();
  } catch {
    // Same reasoning as above.
  }
}

/** Returns the saved edit with fresh object URLs, or null if there is none. */
export async function loadProject(): Promise<{
  settings: ProjectSettings;
  tracks: Track[];
  clips: Clip[];
  assets: MediaAsset[];
  savedAt: number;
} | null> {
  try {
    const db = await openDb();
    const saved = await tx<SavedProject | undefined>(db, STORE_PROJECT, "readonly", (s) =>
      s.get(PROJECT_KEY)
    );
    if (!saved || !saved.clips?.length) {
      db.close();
      return null;
    }

    const assets: MediaAsset[] = [];
    for (const record of saved.assets ?? []) {
      const blob = await tx<Blob | undefined>(db, STORE_FILES, "readonly", (s) => s.get(record.id));
      if (!blob) continue;
      assets.push({ ...record, url: URL.createObjectURL(blob) });
    }
    db.close();

    // Drop clips whose media went missing, so the timeline stays consistent.
    const liveIds = new Set(assets.map((a) => a.id));
    const clips = saved.clips.filter(
      (c) => !("assetId" in c) || liveIds.has((c as { assetId: string }).assetId)
    );

    return { settings: saved.settings, tracks: saved.tracks, clips, assets, savedAt: saved.savedAt };
  } catch {
    return null;
  }
}

export async function clearProject() {
  try {
    const db = await openDb();
    await tx(db, STORE_PROJECT, "readwrite", (s) => s.clear());
    await tx(db, STORE_FILES, "readwrite", (s) => s.clear());
    db.close();
  } catch {
    // Nothing useful to do if clearing fails.
  }
}

export async function estimateUsage(): Promise<string | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    if (!est?.usage) return null;
    const mb = est.usage / 1024 ** 2;
    return mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
  } catch {
    return null;
  }
}
