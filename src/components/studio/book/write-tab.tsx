"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, GripVertical, ListTree, PanelLeft, Settings2, Timer } from "lucide-react";
import { APP_QUERY } from "@/lib/app-mode";
import { ManuscriptEditor } from "@/components/studio/manuscript-editor";
import { useLiveChapter } from "@/components/studio/use-live-chapter";
import { useBookComments } from "./comments-panel";
import { ChapterSidebar } from "./chapter-sidebar";
import { Preview } from "./preview";
import { ToolRail, type ChapterEdit, type RailPanel } from "./tool-rail";
import type { Editor } from "@tiptap/react";
import { loadEditorSettings, saveEditorSettings, type EditorSettings } from "@/lib/editor-settings";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ImagePickerDialog, assetUrl } from "@/components/studio/image-library";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { BackgroundPicker } from "./design-pickers";
import { BACKGROUNDS } from "@/lib/backgrounds";
import { createChapter, logWords, refreshBookWordCount, saveChapter } from "@/lib/studio";
import { elementKind } from "@/lib/elements";
import { themeFor } from "@/lib/themes";
import { editorBlockCss } from "@/lib/theme-css";
import { bookFormat, chapterOptions, type Chapter, type ChapterOptions } from "@/lib/types";
import { fmt } from "@/lib/progress";
import { errorMessage, pb } from "@/lib/pb";
import type { DocNode } from "@/lib/doc/types";
import { cn } from "@/lib/utils";
import type { Workspace } from "./workspace";

const SAVE_DELAY = 1200;

export function WriteTab({ ws }: { ws: Workspace }) {
  const { book, chapters, setChapters, role, live } = ws;
  // the author and co-writers shape the book; editors and commenters work inside its chapters
  const structural = role === "owner" || role === "cowriter";
  const [me] = useState(() => {
    const r = pb().authStore.record;
    return { id: r?.id ?? "", name: String(r?.name || String(r?.email ?? "").split("@")[0] || "Someone") };
  });
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(() => chapters.find((c) => c.kind === "chapter")?.id ?? chapters[0]?.id ?? null);
  const [showPreview, setShowPreview] = useState(true);
  // phones and tablets open on the page itself; the chapter list is a sheet over it
  const [showSidebar, setShowSidebar] = useState(() => !window.matchMedia(APP_QUERY).matches);
  const active = chapters.find((c) => c.id === activeId) ?? null;
  const [editor, setEditor] = useState<Editor | null>(null);
  const [rail, setRail] = useState<RailPanel | null>(null);
  const comments = useBookComments(book.id, editor, activeId, activeComment);
  const openComment = useCallback(
    (id: string) => {
      setActiveComment(id);
      setRail("comments");
    },
    [setRail],
  );
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
  const [resizeHintSeen, setResizeHintSeen] = useState(() => {
    try {
      return localStorage.getItem("jp-resize-hint") === "1";
    } catch {
      return true;
    }
  });
  const dismissResizeHint = useCallback(() => {
    setResizeHintSeen(true);
    try {
      localStorage.setItem("jp-resize-hint", "1");
    } catch {
      // no storage: the tip comes back next visit
    }
  }, []);
  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    dismissResizeHint();
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
  const theme = themeFor(bookFormat(book));
  const blockCss = editorBlockCss(theme);

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
      setChapters((all) => all.map((c) => (c.id === activeId ? { ...c, content: doc, word_count: words } : c)));
      // a shared book's chapters are saved by the collab server
      if (live) return;
      pendingRef.current = { id: activeId, doc, words };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, SAVE_DELAY);
    },
    [activeId, flush, live, setChapters],
  );

  async function select(id: string) {
    await flush();
    setActiveId(id);
    setActiveComment(null);
    if (window.matchMedia(`(max-width: 767px), ${APP_QUERY}`).matches) setShowSidebar(false);
  }

  /** adds a section, or one chapter per title (from the AI outline) */
  async function add(kind: string, titles?: string[]) {
    await flush();
    const k = elementKind(kind);
    let order = Math.max(-1, ...chapters.filter((c) => c.section === k.section).map((c) => c.order)) + 1;
    let n = chapters.filter((c) => c.kind === "chapter").length + 1;
    try {
      for (const title of titles?.length ? titles : [kind === "chapter" ? `Chapter ${n}` : k.label]) {
        const created = await ws.track(createChapter(book, { kind, order: order++, title }));
        n++;
        setChapters((all) => [...all, created]);
        setActiveId(created.id);
      }
      if (window.matchMedia(APP_QUERY).matches) setShowSidebar(false);
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

  function patchOptions(o: Partial<ChapterOptions>) {
    if (!active) return;
    const next = { ...chapterOptions(active), ...o };
    for (const k of Object.keys(next) as (keyof ChapterOptions)[]) if (next[k] === false || next[k] === "") delete next[k];
    return patch({ options: next });
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
  const opts = active ? chapterOptions(active) : {};
  // sections with a title block of their own (not the title page, copyright, dedication or a part divider)
  const headed = !!kind && !kind.smart && !kind.hideTitle && kind.id !== "part" && kind.layout !== "full_image";
  const [pickingImage, setPickingImage] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const [pickingBg, setPickingBg] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 app:pb-[calc(var(--app-tab-h)+env(safe-area-inset-bottom))]">
      <aside
        aria-label="Chapters"
        className={cn(
          "w-72 shrink-0 border-r border-border bg-card",
          showSidebar ? "block" : "hidden",
          "max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:top-[96px] max-md:z-20 max-md:shadow-xl",
          // phones and tablets: a full-screen sheet with its own app bar
          showSidebar && "app:fixed app:inset-0! app:z-50 app:flex app:w-full app:flex-col app:border-0 app:shadow-none app:animate-in app:slide-in-from-bottom app:duration-300",
        )}
      >
        <div className="app-bar hidden shrink-0 bg-[var(--app-bar)] pt-[env(safe-area-inset-top)] text-[var(--app-bar-ink)] app:block">
          <div className="relative flex h-14 items-center justify-center px-2">
            <h2 className="text-[17px] font-semibold tracking-tight">Chapters</h2>
            <button type="button" onClick={() => setShowSidebar(false)} className="absolute right-2 h-11 px-3 text-[17px] font-semibold active:opacity-70">
              Done
            </button>
          </div>
        </div>
        <div className="h-full app:min-h-0 app:flex-1">
          <ChapterSidebar ws={ws} activeId={activeId} onSelect={select} onAdd={add} />
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-2">
          <Button variant="ghost" size="icon-sm" aria-label={showSidebar ? "Hide chapters" : "Show chapters"} onClick={() => setShowSidebar((v) => !v)} className="app:hidden">
            <PanelLeft />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSidebar(true)} className="hidden app:inline-flex">
            <ListTree /> Chapters
          </Button>
          {active && kind && (
            <>
              <input
                aria-label="Title"
                value={active.title}
                readOnly={!structural}
                onChange={(e) => setChapters((all) => all.map((c) => (c.id === active.id ? { ...c, title: e.target.value } : c)))}
                onBlur={(e) => patch({ title: e.target.value.trim() || kind.label })}
                className="min-w-40 flex-1 rounded bg-transparent px-1.5 py-1 text-lg font-medium tracking-tight hover:bg-paper focus:bg-paper app:order-first app:basis-full app:text-xl"
              />
              <select
                aria-label="Status"
                value={active.status}
                disabled={!structural}
                onChange={(e) => patch({ status: e.target.value as Chapter["status"] })}
                className="h-8 rounded border border-input bg-card px-2 text-sm app:h-11"
              >
                <option value="draft">Draft</option>
                <option value="revised">Revised</option>
                <option value="final">Final</option>
              </select>
              <span className="tabular hidden text-sm text-soft sm:inline">{fmt(active.word_count || 0)} words</span>
              {role === "owner" && <SprintTimer bookId={book.id} />}
              <Button variant="ghost" size="icon-sm" aria-label={showPreview ? "Hide preview" : "Show preview"} onClick={() => setShowPreview((v) => !v)} className="max-lg:hidden">
                {showPreview ? <EyeOff /> : <Eye />}
              </Button>
              {structural && (
                <DropdownMenu>
                  <DropdownMenuTrigger aria-label="Chapter settings" title="Chapter settings" className="rounded p-1.5 text-ink-2 hover:bg-muted data-[state=open]:bg-muted app:ml-auto app:grid app:size-11 app:place-items-center">
                    <Settings2 className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-[80vh] w-72 overflow-y-auto">
                    {headed && (
                      <>
                        <DropdownMenuLabel>Chapter opening</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => setPickingImage(true)}>{opts.image ? "Change chapter image…" : "Add chapter image…"}</DropdownMenuItem>
                        {opts.image && (
                          <>
                            <DropdownMenuCheckboxItem checked={!!opts.hideImage} onCheckedChange={(v) => patchOptions({ hideImage: !!v })}>
                              Hide chapter image
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={!!opts.invert} disabled={!!opts.hideImage || !!opts.hideHeading} onCheckedChange={(v) => patchOptions({ invert: !!v })}>
                              White title over the image
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                patchOptions({
                                  image: "",
                                  hideImage: false,
                                  invert: false,
                                })
                              }
                            >
                              Remove chapter image
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuCheckboxItem checked={!!opts.hideHeading} onCheckedChange={(v) => patchOptions({ hideHeading: !!v })}>
                          Hide chapter heading
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={!!opts.smallTitle} disabled={!!opts.hideHeading} onCheckedChange={(v) => patchOptions({ smallTitle: !!v })}>
                          Smaller chapter title
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {kind.layout === "full_image" && (
                      <>
                        <DropdownMenuLabel>Full-page picture</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => setPickingImage(true)}>{opts.image ? "Change the picture…" : "Choose the picture…"}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuLabel>Look</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => setBgOpen(true)}>{opts.background && opts.background !== "none" ? "Change page background…" : "Page background…"}</DropdownMenuItem>
                    <DropdownMenuCheckboxItem checked={opts.only === "ebook"} onCheckedChange={(v) => patchOptions({ only: v ? "ebook" : undefined })}>
                      Ebook only (left out of print)
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={opts.only === "print"} onCheckedChange={(v) => patchOptions({ only: v ? "print" : undefined })}>
                      Print only (left out of the ebook)
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {active.kind === "part" && (
                      <>
                        <DropdownMenuLabel>Box set</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem checked={!!opts.volume} onCheckedChange={(v) => patchOptions({ volume: !!v })}>
                          Starts a new book (Book One, Two…)
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {!kind.smart && (
                      <>
                        <DropdownMenuLabel>Print pages</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem checked={!!opts.hidePageNumber} onCheckedChange={(v) => patchOptions({ hidePageNumber: !!v })}>
                          Hide page numbers
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={!!opts.hideHeader} onCheckedChange={(v) => patchOptions({ hideHeader: !!v })}>
                          Hide running head
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Contents and website</DropdownMenuLabel>
                        <DropdownMenuCheckboxItem checked={active.in_toc} onCheckedChange={(v) => patch({ in_toc: !!v })}>
                          Show in table of contents
                        </DropdownMenuCheckboxItem>
                      </>
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
              )}
              <ImagePickerDialog
                open={pickingImage}
                onOpenChange={setPickingImage}
                bookId={book.id}
                title="Chapter image"
                description="Shown at the top of the chapter's first page, in print and in the ebook. Wide images work best."
                onPick={(a) => patchOptions({ image: assetUrl(a), hideImage: false })}
              />
              <Dialog open={bgOpen} onOpenChange={setBgOpen}>
                <DialogContent className="max-w-4xl grid-cols-1 [&>*]:min-w-0">
                  <DialogTitle>Background for “{active.title}”</DialogTitle>
                  <DialogDescription>Pick one of {BACKGROUNDS.length} backgrounds or upload a picture. “Use the book&apos;s” follows the Format tab.</DialogDescription>
                  <BackgroundPicker
                    value={opts.background === "none" ? "" : (opts.background ?? "")}
                    noneLabel="Use the book's"
                    onChange={(v) => patchOptions({ background: v || undefined })}
                    onUpload={() => setPickingBg(true)}
                  />
                  <div className="flex flex-wrap items-center gap-5 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={opts.background === "none"} onChange={(e) => patchOptions({ background: e.target.checked ? "none" : undefined })} />
                      No background on this section
                    </label>
                    {opts.background && opts.background !== "none" && (
                      <>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={!!opts.backgroundOpener} onChange={(e) => patchOptions({ backgroundOpener: e.target.checked })} />
                          Only on the first page
                        </label>
                        <label className="flex items-center gap-2">
                          Strength
                          <input
                            type="range"
                            min={10}
                            max={100}
                            step={5}
                            value={Math.round((opts.backgroundStrength ?? 0.8) * 100)}
                            onChange={(e) => patchOptions({ backgroundStrength: Number(e.target.value) / 100 })}
                            className="w-36 accent-[var(--primary)]"
                          />
                        </label>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <ImagePickerDialog
                open={pickingBg}
                onOpenChange={setPickingBg}
                bookId={book.id}
                title="Background picture"
                description="Fills the pages of this section behind the text, faded so the words stay readable."
                onPick={(a) => patchOptions({ background: assetUrl(a) })}
              />
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
              readOnly={!structural}
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
          <ChapterEditor
            key={active.id}
            chapter={active}
            live={live}
            bookId={book.id}
            onChange={onChange}
            fontFamily={theme.bodyCss}
            blockCss={blockCss}
            settings={settings}
            onEditor={setEditor}
            onFind={openFind}
            me={me}
            tracking={role === "editor"}
            readOnly={role === "commenter"}
            onCommentClick={openComment}
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
          bookId={book.id}
          role={role}
          live={live}
          me={me}
          comments={comments}
          activeComment={activeComment}
          onActiveComment={setActiveComment}
          preview={<Preview book={book} chapters={chapters} chapterId={activeId} onSelect={select} />}
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
            onDoubleClick={() => resizePreview(440)}
            title="Drag to resize the preview. Double-click to reset."
            className="group absolute inset-y-0 -left-2 z-10 w-4 cursor-col-resize touch-none outline-none"
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition group-hover:w-0.5 group-hover:bg-primary/60 group-focus-visible:w-0.5 group-focus-visible:bg-primary" />
          </div>
          {/* arrows on the edge: click to widen or narrow, or drag the middle */}
          <div className="absolute top-1/2 -left-3.5 z-10 flex w-7 -translate-y-1/2 flex-col items-center overflow-hidden rounded-full border border-border bg-card text-ink-2 shadow-md">
            <button
              type="button"
              title="Make the preview wider"
              aria-label="Make the preview wider"
              onClick={() => {
                dismissResizeHint();
                resizePreview(previewWidth + 80);
              }}
              className="grid h-7 w-full place-items-center hover:bg-primary-soft hover:text-primary"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span
              onPointerDown={startResize}
              title="Drag to resize"
              aria-hidden
              className="grid h-6 w-full cursor-col-resize touch-none place-items-center border-y border-border text-soft hover:text-primary"
            >
              <GripVertical className="size-3.5" />
            </span>
            <button
              type="button"
              title="Make the preview narrower"
              aria-label="Make the preview narrower"
              onClick={() => {
                dismissResizeHint();
                resizePreview(previewWidth - 80);
              }}
              className="grid h-7 w-full place-items-center hover:bg-primary-soft hover:text-primary"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          {!resizeHintSeen && (
            <div role="note" className="absolute top-1/2 left-6 z-10 w-52 -translate-y-1/2 rounded-md border border-primary/40 bg-card p-3 text-[13px] text-ink-2 shadow-lg">
              <p>
                <span className="font-medium text-ink">Tip:</span> use the arrows on the left edge, or drag the grip between them, to make the preview wider or narrower.
              </p>
              <button type="button" onClick={dismissResizeHint} className="mt-2 text-[13px] font-medium text-primary hover:underline">
                Got it
              </button>
            </div>
          )}
          <Preview book={book} chapters={chapters} chapterId={activeId} onSelect={select} />
        </aside>
      )}
    </div>
  );
}

/** The open chapter: straight from its saved content, or live through the collab server in a shared book. */
function ChapterEditor({ chapter, live, ...props }: { chapter: Chapter; live: boolean } & Omit<React.ComponentProps<typeof ManuscriptEditor>, "chapterId" | "initial" | "live">) {
  const doc = useLiveChapter(chapter.id, chapter.collab_gen, live);
  if (live && !doc) return <p className="p-10 text-soft">Opening the shared chapter…</p>;
  return <ManuscriptEditor {...props} chapterId={chapter.id} initial={chapter.content} live={live ? doc : null} />;
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
