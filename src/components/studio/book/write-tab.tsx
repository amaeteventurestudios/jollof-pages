"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, MoreHorizontal, PanelLeft, Timer } from "lucide-react";
import { ManuscriptEditor } from "@/components/studio/manuscript-editor";
import { ChapterSidebar } from "./chapter-sidebar";
import { Preview } from "./preview";
import { ToolRail, type ChapterEdit, type RailPanel } from "./tool-rail";
import type { Editor } from "@tiptap/react";
import { loadEditorSettings, saveEditorSettings, type EditorSettings } from "@/lib/editor-settings";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createChapter, logWords, refreshBookWordCount, saveChapter } from "@/lib/studio";
import { elementKind } from "@/lib/elements";
import { getTheme } from "@/lib/themes";
import { bookFormat, type Chapter } from "@/lib/types";
import { fmt } from "@/lib/progress";
import { errorMessage, pb } from "@/lib/pb";
import type { DocNode } from "@/lib/doc/types";
import { cn } from "@/lib/utils";
import type { Workspace } from "./workspace";

const SAVE_DELAY = 1200;

export function WriteTab({ ws }: { ws: Workspace }) {
  const { book, chapters, setChapters } = ws;
  const [activeId, setActiveId] = useState<string | null>(() => chapters.find((c) => c.kind === "chapter")?.id ?? chapters[0]?.id ?? null);
  const [showPreview, setShowPreview] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const active = chapters.find((c) => c.id === activeId) ?? null;
  const [editor, setEditor] = useState<Editor | null>(null);
  const [rail, setRail] = useState<RailPanel | null>(null);
  // this tab only renders in the browser, after the book has loaded, so storage can seed state
  const [settings, setSettings] = useState<EditorSettings>(loadEditorSettings);
  const changeSettings = useCallback((s: EditorSettings) => {
    setSettings(s);
    saveEditorSettings(s);
  }, []);
  const openFind = useCallback(() => setRail("find"), [setRail]);
  const [previewWidth, setPreviewWidth] = useState(() => {
    try {
      return Number(localStorage.getItem("jp-preview-width")) || 440;
    } catch {
      return 440;
    }
  });
  const resizePreview = useCallback((w: number) => {
    const clamped = Math.round(Math.min(Math.max(320, w), Math.max(360, window.innerWidth * 0.7)));
    setPreviewWidth(clamped);
    try {
      localStorage.setItem("jp-preview-width", String(clamped));
    } catch {
      // no storage: the width lasts for this visit
    }
  }, []);
  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = previewWidth;
    const move = (ev: PointerEvent) => resizePreview(startW + (startX - ev.clientX));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  const theme = getTheme(bookFormat(book).theme);

  // autosave: one pending content save at a time, flushed when switching chapters
  const pendingRef = useRef<{ id: string; doc: DocNode; words: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedWords = useRef(new Map<string, number>());
  const chaptersRef = useRef(chapters);
  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);

  const flush = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const p = pendingRef.current;
    if (!p) return;
    pendingRef.current = null;
    const ch = chaptersRef.current.find((c) => c.id === p.id);
    if (!ch) return;
    const before = savedWords.current.get(p.id) ?? ch.word_count ?? 0;
    try {
      await ws.track(saveChapter(ch, { content: p.doc, word_count: p.words }));
      savedWords.current.set(p.id, p.words);
      const next = chaptersRef.current.map((c) => (c.id === p.id ? { ...c, word_count: p.words } : c));
      const total = await refreshBookWordCount(book.id, next);
      ws.setBook((b) => (b ? { ...b, word_count: total } : b));
      await logWords(book.id, p.words - before);
    } catch {
      // keep the change queued so the next edit retries it
      pendingRef.current = pendingRef.current ?? p;
    }
  }, [book.id, ws]);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (pendingRef.current) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      flush();
    };
  }, [flush]);

  const onChange = useCallback(
    (doc: DocNode, words: number) => {
      if (!activeId) return;
      pendingRef.current = { id: activeId, doc, words };
      setChapters((all) => all.map((c) => (c.id === activeId ? { ...c, content: doc, word_count: words } : c)));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, SAVE_DELAY);
    },
    [activeId, flush, setChapters],
  );

  async function select(id: string) {
    await flush();
    setActiveId(id);
    if (window.matchMedia("(max-width: 767px)").matches) setShowSidebar(false);
  }

  async function add(kind: string) {
    await flush();
    const k = elementKind(kind);
    const order = Math.max(-1, ...chapters.filter((c) => c.section === k.section).map((c) => c.order)) + 1;
    const n = chapters.filter((c) => c.kind === "chapter").length + 1;
    try {
      const created = await ws.track(createChapter(book, { kind, order, title: kind === "chapter" ? `Chapter ${n}` : k.label }));
      setChapters((all) => [...all, created]);
      setActiveId(created.id);
    } catch (e) {
      alert(`Could not add: ${errorMessage(e)}`);
    }
  }

  /** sections changed by book-wide replace or smart quotes, saved one by one */
  async function editChapters(edits: ChapterEdit[]) {
    await flush();
    for (const e of edits) {
      const ch = chaptersRef.current.find((c) => c.id === e.id);
      if (!ch) continue;
      await ws.track(saveChapter(ch, { content: e.content, word_count: e.words }));
      savedWords.current.set(e.id, e.words);
    }
    const byId = new Map(edits.map((e) => [e.id, e]));
    const next = chaptersRef.current.map((c) => {
      const e = byId.get(c.id);
      return e ? { ...c, content: e.content, word_count: e.words } : c;
    });
    setChapters(next);
    const total = await refreshBookWordCount(book.id, next);
    ws.setBook((b) => (b ? { ...b, word_count: total } : b));
  }

  async function patch(p: Partial<Chapter>) {
    if (!active) return;
    setChapters((all) => all.map((c) => (c.id === active.id ? { ...c, ...p } : c)));
    await ws.track(saveChapter(active, p));
  }

  async function remove() {
    if (!active || !confirm(`Delete “${active.title}”? This cannot be undone.`)) return;
    pendingRef.current = null;
    await ws.track(pb().collection("chapters").delete(active.id));
    const rest = chapters.filter((c) => c.id !== active.id);
    setChapters(rest);
    setActiveId(rest[0]?.id ?? null);
    const total = await refreshBookWordCount(book.id, rest);
    ws.setBook((b) => (b ? { ...b, word_count: total } : b));
  }

  const kind = active ? elementKind(active.kind) : null;

  return (
    <div className="flex min-h-0 flex-1">
      <aside className={cn("w-72 shrink-0 border-r border-border bg-card", showSidebar ? "block" : "hidden", "max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:top-[96px] max-md:z-20 max-md:shadow-xl")}>
        <ChapterSidebar ws={ws} activeId={activeId} onSelect={select} onAdd={add} />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
          <Button variant="ghost" size="icon-sm" aria-label={showSidebar ? "Hide chapters" : "Show chapters"} onClick={() => setShowSidebar((v) => !v)}>
            <PanelLeft />
          </Button>
          {active && kind && (
            <>
              <input
                aria-label="Title"
                value={active.title}
                onChange={(e) => setChapters((all) => all.map((c) => (c.id === active.id ? { ...c, title: e.target.value } : c)))}
                onBlur={(e) => patch({ title: e.target.value.trim() || kind.label })}
                className="min-w-0 flex-1 rounded bg-transparent px-1.5 py-1 text-lg font-medium tracking-tight hover:bg-paper focus:bg-paper"
              />
              <select
                aria-label="Status"
                value={active.status}
                onChange={(e) => patch({ status: e.target.value as Chapter["status"] })}
                className="h-8 rounded border border-input bg-card px-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="revised">Revised</option>
                <option value="final">Final</option>
              </select>
              <span className="tabular hidden text-sm text-soft sm:inline">{fmt(active.word_count || 0)} words</span>
              <SprintTimer bookId={book.id} />
              <Button variant="ghost" size="icon-sm" aria-label={showPreview ? "Hide preview" : "Show preview"} onClick={() => setShowPreview((v) => !v)} className="max-lg:hidden">
                {showPreview ? <EyeOff /> : <Eye />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger aria-label="Section options" className="rounded p-1.5 text-ink-2 hover:bg-muted">
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {!kind.smart && (
                    <DropdownMenuCheckboxItem checked={active.in_toc} onCheckedChange={(v) => patch({ in_toc: !!v })}>
                      Show in table of contents
                    </DropdownMenuCheckboxItem>
                  )}
                  {active.kind === "chapter" && (
                    <DropdownMenuCheckboxItem checked={active.numbered} onCheckedChange={(v) => patch({ numbered: !!v })}>
                      Number this chapter
                    </DropdownMenuCheckboxItem>
                  )}
                  {!kind.smart && (
                    <DropdownMenuCheckboxItem checked={active.is_sample} onCheckedChange={(v) => patch({ is_sample: !!v })}>
                      Free sample on the website
                    </DropdownMenuCheckboxItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onSelect={remove}>
                    Delete this section
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
        {active && kind && !kind.smart && (
          <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-1.5">
            <label htmlFor="ch-sub" className="text-[13px] text-soft">
              Subtitle
            </label>
            <input
              id="ch-sub"
              value={active.subtitle}
              placeholder="Optional"
              onChange={(e) => setChapters((all) => all.map((c) => (c.id === active.id ? { ...c, subtitle: e.target.value } : c)))}
              onBlur={(e) => patch({ subtitle: e.target.value.trim() })}
              className="min-w-0 flex-1 rounded bg-transparent px-1.5 py-0.5 text-sm italic hover:bg-paper focus:bg-paper"
            />
          </div>
        )}
        {!active ? (
          <p className="p-10 text-soft">Add a section from the list on the left to start writing.</p>
        ) : kind?.smart ? (
          <div className="flex-1 overflow-y-auto p-10">
            <div className="max-w-xl">
              <h2 className="text-xl">{kind.label}</h2>
              <p className="mt-2 text-ink-2">{kind.hint} It is built automatically when you export, so there is nothing to type here. The preview on the right shows how it will look.</p>
            </div>
          </div>
        ) : (
          <ManuscriptEditor
            key={active.id}
            chapterId={active.id}
            bookId={book.id}
            initial={active.content}
            onChange={onChange}
            fontFamily={theme.bodyCss}
            settings={settings}
            onEditor={setEditor}
            onFind={openFind}
          />
        )}
      </section>

      <div className="relative flex shrink-0">
        <ToolRail
          open={rail}
          onOpen={setRail}
          editor={kind?.smart ? null : editor}
          chapters={chapters}
          activeId={activeId}
          onSelect={select}
          onEditChapters={editChapters}
          settings={settings}
          onSettings={changeSettings}
        />
      </div>

      {showPreview && (
        <aside className="relative hidden shrink-0 border-l border-border bg-card lg:block" style={{ width: previewWidth }} aria-label="Preview">
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Drag to resize the preview"
            aria-valuenow={previewWidth}
            tabIndex={0}
            onPointerDown={startResize}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") resizePreview(previewWidth + 40);
              if (e.key === "ArrowRight") resizePreview(previewWidth - 40);
            }}
            className="group absolute inset-y-0 -left-1.5 z-10 w-3 cursor-col-resize"
          >
            <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition group-hover:bg-primary/50 group-focus-visible:bg-primary" />
          </div>
          <Preview book={book} chapters={chapters} chapterId={activeId} onSelect={select} />
        </aside>
      )}
    </div>
  );
}

/** A writing sprint: pick a length, write, and the minutes go into the writing log. */
function SprintTimer({ bookId }: { bookId: string }) {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [length, setLength] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= endsAt) {
        setEndsAt(null);
        logWords(bookId, 0, length);
        alert(`Sprint done: ${length} minutes of writing. Nice work.`);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [endsAt, bookId, length]);

  if (endsAt) {
    const left = Math.max(0, Math.round((endsAt - now) / 1000));
    return (
      <button type="button" onClick={() => setEndsAt(null)} className="tabular inline-flex h-8 items-center gap-1.5 rounded bg-primary-soft px-2.5 text-sm text-primary" title="Stop sprint">
        <Timer className="size-4" />
        {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
      </button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded px-2 text-sm text-ink-2 hover:bg-muted">
        <Timer className="size-4" />
        <span className="hidden xl:inline">Sprint</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {[15, 25, 45, 60].map((m) => (
          <DropdownMenuItem
            key={m}
            onSelect={() => {
              setLength(m);
              setNow(Date.now());
              setEndsAt(Date.now() + m * 60000);
            }}
          >
            {m} minute sprint
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
