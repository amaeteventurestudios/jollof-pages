"use client";

import { useEffect, useState } from "react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import * as Y from "yjs";
import { pb } from "@/lib/pb";
import { docName } from "@/lib/collab";

/**
 * A live connection to one chapter on the collab server, for shared books. The server answers
 * "stale" when the chapter has a newer working copy; the hook then reads the current generation
 * and connects again with an empty document, so old text is never merged back in.
 */

export interface LiveChapter {
  doc: Y.Doc;
  provider: HocuspocusProvider;
  /** changes from this editor that the server has not stored yet */
  synced: boolean;
  /** connection trouble to show the writer */
  problem: string;
}

const COLORS = ["#c2410c", "#0f766e", "#7c3aed", "#be123c", "#1d4ed8", "#a16207", "#047857", "#9333ea"];

export function colorFor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}

export function collabUrl(): string {
  const env = process.env.NEXT_PUBLIC_COLLAB_URL;
  if (env) return env;
  const { protocol, hostname, host } = window.location;
  // in development the collab server runs on its own port; in production Caddy serves it at /collab
  if (hostname === "localhost" || hostname === "127.0.0.1") return `ws://${hostname}:3102`;
  return `${protocol === "https:" ? "wss" : "ws"}://${host}/collab`;
}

export function useLiveChapter(chapterId: string | null, initialGen: string | undefined, enabled: boolean): LiveChapter | null {
  const [gen, setGen] = useState(initialGen || "0");
  const [live, setLive] = useState<LiveChapter | null>(null);

  useEffect(() => {
    if (!enabled || !chapterId) return;
    const doc = new Y.Doc();
    let stopped = false;
    const provider = new HocuspocusProvider({
      url: collabUrl(),
      name: docName(chapterId, gen),
      document: doc,
      token: () => pb().authStore.token,
      onAuthenticationFailed: async ({ reason }) => {
        if (stopped) return;
        // "stale", or the first person in started a new generation a moment ago: open the current one
        const ch = await pb()
          .collection("chapters")
          .getOne<{ collab_gen?: string }>(chapterId, { fields: "collab_gen" })
          .catch(() => null);
        if (stopped) return;
        if (ch?.collab_gen && ch.collab_gen !== gen) {
          setGen(ch.collab_gen);
          return;
        }
        if (reason === "stale") reason = "This chapter changed. Reload the page to keep writing.";
        setLive((l) => (l ? { ...l, problem: reason || "Could not open this chapter for live editing." } : l));
      },
      onSynced: () => setLive((l) => (l ? { ...l, synced: true, problem: "" } : l)),
      onStatus: ({ status }) => {
        if (status === "disconnected") setLive((l) => (l ? { ...l, problem: "Reconnecting… your changes are kept and will be sent." } : l));
        else if (status === "connected") setLive((l) => (l ? { ...l, problem: "" } : l));
      },
    });
    // set once per connection; the callbacks above refine it
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLive({ doc, provider, synced: false, problem: "" });
    return () => {
      stopped = true;
      provider.destroy();
      doc.destroy();
      setLive(null);
    };
  }, [chapterId, gen, enabled]);

  return live;
}
