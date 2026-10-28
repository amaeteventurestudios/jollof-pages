"use client";

// Book cover designer: the Jollof Studio editor embedded in Jollof Pages.
// The editor comes from @jollof/studio-editor (vendor/, built from the
// jollofstudio repo). Covers are kept in this browser for now; saving them to
// the book's assets in Supabase/R2 is the next step.

import "@jollof/studio-editor/editor.css";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileDown, Loader2 } from "lucide-react";
import { createDesign, DesignStore, JollofEditor, migrateDesign, type Design, type EditorActions } from "@jollof/studio-editor";

export interface CoverDesignerProps {
  bookId: string;
  bookTitle: string;
  seriesTitle: string;
  backHref: string;
}

const storageKey = (bookId: string) => `jp-cover:${bookId}`;

function starterCover(bookTitle: string, seriesTitle: string): Design {
  const design = createDesign({ title: `${bookTitle} cover`, preset: "kdp-6x9" });
  const page = design.pages[0]!;
  page.background = "#0f0d08";
  const store = DesignStore.fromDesign(design);
  const w = page.width;
  const add = (element: Record<string, unknown>) => store.dispatch("element.add", { pageId: page.id, element });
  add({ type: "text", text: seriesTitle.toUpperCase(), x: w * 0.1, y: 260, width: w * 0.8, height: 70, fontSize: 56, fontFamily: "Poppins", fontWeight: 600, letterSpacing: 12, fill: "#f97316", textAlign: "center" });
  add({ type: "text", text: bookTitle, x: w * 0.08, y: 400, width: w * 0.84, height: 420, fontSize: 150, fontFamily: "Poppins", fontWeight: 800, lineHeight: 1.05, fill: "#fef3c7", textAlign: "center" });
  add({ type: "text", text: "AUTHOR NAME", x: w * 0.1, y: page.height - 320, width: w * 0.8, height: 70, fontSize: 60, fontFamily: "Poppins", fontWeight: 600, letterSpacing: 8, fill: "#a8956b", textAlign: "center" });
  return store.getDesign();
}

function load(bookId: string, bookTitle: string, seriesTitle: string): DesignStore {
  try {
    const saved = localStorage.getItem(storageKey(bookId));
    if (saved) return DesignStore.fromDesign(migrateDesign(JSON.parse(saved)));
  } catch {
    // Unreadable or old copy: start fresh.
  }
  return DesignStore.fromDesign(starterCover(bookTitle, seriesTitle));
}

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export default function CoverDesigner({ bookId, bookTitle, seriesTitle, backHref }: CoverDesignerProps) {
  const store = useMemo(() => load(bookId, bookTitle, seriesTitle), [bookId, bookTitle, seriesTitle]);
  const [actions, setActions] = useState<EditorActions | null>(null);
  const [saved, setSaved] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Keep the cover in this browser, a moment after each change.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = store.subscribe((design) => {
      setSaved(false);
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(storageKey(bookId), JSON.stringify(design));
          setSaved(true);
        } catch {
          // Storage full (large photos): the cover stays open, it just isn't kept.
        }
      }, 600);
    });
    return () => {
      clearTimeout(timer);
      off();
    };
  }, [store, bookId]);

  const name = bookTitle.replace(/[^\p{L}\p{N} -]+/gu, "").trim() || "cover";

  const exportPng = () => {
    const url = actions?.exportImage("png");
    if (url) download(url, `${name} cover.png`);
  };

  const exportPdf = async () => {
    if (!actions) return;
    setBusy("pdf");
    try {
      const bytes = await actions.exportPdf({ cropMarks: false });
      if (bytes) download(URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" })), `${name} cover (print).pdf`);
    } finally {
      setBusy(null);
    }
  };

  const header = (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-jx-border bg-jx-surface px-3">
      <Link href={backHref} aria-label="Back to the book" className="flex h-8 w-8 items-center justify-center rounded-lg text-jx-muted hover:bg-jx-surface-2 hover:text-jx-text">
        <ArrowLeft size={17} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-jx-text">{bookTitle}: cover</p>
        <p className="truncate text-[11px] text-jx-muted">{saved ? "Saved in this browser" : "Saving…"}</p>
      </div>
      <button type="button" onClick={exportPng} disabled={!actions} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-jx-border px-3 text-[13px] font-medium text-jx-text hover:bg-jx-surface-2 disabled:opacity-50">
        <Download size={15} /> <span className="max-sm:hidden">PNG</span>
      </button>
      <button type="button" onClick={exportPdf} disabled={!actions || !!busy} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-jx-accent px-3 text-[13px] font-semibold text-jx-accent-fg hover:bg-jx-accent-hover disabled:opacity-50">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} <span className="max-sm:hidden">Print PDF</span>
      </button>
    </header>
  );

  return (
    <div className="jp-cover-editor h-dvh">
      <JollofEditor store={store} header={header} initialPanel="templates" onActions={setActions} />
    </div>
  );
}
