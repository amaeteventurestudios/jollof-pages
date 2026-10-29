"use client";

import { useEffect, useSyncExternalStore } from "react";
import { pb } from "@/lib/pb";
import type { DocNode } from "@/lib/doc/types";

/** A block an author saved to reuse in any of their books. */
export interface SavedBlock {
  id: string;
  name: string;
  content: DocNode;
  kind: string;
  updated: string;
}

interface Prefs {
  /** block ids, or "saved:<id>" for a saved block */
  favourites: string[];
  recent: string[];
}

interface State {
  prefs: Prefs;
  saved: SavedBlock[] | null;
}

const RECENT = 8;
let state: State = { prefs: { favourites: [], recent: [] }, saved: null };
let loadedFor: string | null = null;
const listeners = new Set<() => void>();

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function cleanPrefs(raw: unknown): Prefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length < 60).slice(0, 60) : []);
  return { favourites: ids(r.favourites), recent: ids(r.recent).slice(0, RECENT) };
}

async function load() {
  const me = pb().authStore.record;
  if (!me || loadedFor === me.id) return;
  loadedFor = me.id;
  set({ prefs: cleanPrefs(me.editor_prefs) });
  try {
    const rows = await pb().collection("saved_blocks").getFullList<SavedBlock>({ sort: "name" });
    set({ saved: rows });
  } catch {
    set({ saved: [] });
  }
}

async function savePrefs(prefs: Prefs) {
  set({ prefs });
  const me = pb().authStore.record;
  if (!me) return;
  try {
    await pb().collection("users").update(me.id, { editor_prefs: prefs });
  } catch {
    // favourites are a convenience; keep them for this visit even if the save fails
  }
}

/** Favourites, recently used and saved blocks, kept on the author's account. */
export function useBlockLibrary() {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
  useEffect(() => {
    void load();
  }, []);
  return {
    ...s,
    isFavourite: (id: string) => s.prefs.favourites.includes(id),
    toggleFavourite: (id: string) => {
      const f = state.prefs.favourites;
      void savePrefs({ ...state.prefs, favourites: f.includes(id) ? f.filter((x) => x !== id) : [id, ...f] });
    },
    used: (id: string) => {
      void savePrefs({ ...state.prefs, recent: [id, ...state.prefs.recent.filter((x) => x !== id)].slice(0, RECENT) });
    },
    async saveBlock(name: string, node: DocNode) {
      const me = pb().authStore.record;
      if (!me) throw new Error("Sign in first.");
      const kind = node.type === "box" ? String(node.attrs?.variant ?? "box") : node.type;
      const row = await pb().collection("saved_blocks").create<SavedBlock>({ owner: me.id, name: name.slice(0, 80), content: node, kind });
      set({ saved: [...(state.saved ?? []), row].sort((a, b) => a.name.localeCompare(b.name)) });
      return row;
    },
    async rename(id: string, name: string) {
      const row = await pb().collection("saved_blocks").update<SavedBlock>(id, { name: name.slice(0, 80) });
      set({ saved: (state.saved ?? []).map((b) => (b.id === id ? row : b)) });
    },
    async remove(id: string) {
      await pb().collection("saved_blocks").delete(id);
      set({ saved: (state.saved ?? []).filter((b) => b.id !== id) });
      const key = `saved:${id}`;
      if (state.prefs.favourites.includes(key) || state.prefs.recent.includes(key))
        void savePrefs({ favourites: state.prefs.favourites.filter((x) => x !== key), recent: state.prefs.recent.filter((x) => x !== key) });
    },
  };
}
