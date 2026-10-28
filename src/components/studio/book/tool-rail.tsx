"use client";

import { useEffect, useMemo, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { searchDocument, type SearchOptions } from "@tiptap/extension-find-and-replace";
import { Fragment, type Node as PMNode, type Schema } from "@tiptap/pm/model";
import { Transform } from "@tiptap/pm/transform";
import { ChevronDown, ChevronUp, FileDiff, MessageSquare, Quote, Search, Sparkles, Type, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_EDITOR_SETTINGS, EDITOR_FONTS, type EditorSettings } from "@/lib/editor-settings";
import { curlQuotesTransform, straightQuotesIn } from "@/lib/smart-quotes";
import type { DocNode } from "@/lib/doc/types";
import type { Chapter } from "@/lib/types";
import type { CollabRole } from "@/lib/collab";
import { listChanges } from "@/components/studio/track-changes";
import { ChangesPanel } from "./changes-panel";
import { CommentsPanel, type Comment } from "./comments-panel";
import { AssistantPanel } from "./assistant-panel";
import { cn } from "@/lib/utils";

export type RailPanel = "assistant" | "settings" | "find" | "quotes" | "changes" | "comments";

export interface ChapterEdit {
  id: string;
  content: DocNode;
  words: number;
}

interface RailProps {
  open: RailPanel | null;
  onOpen: (p: RailPanel | null) => void;
  editor: Editor | null;
  chapters: Chapter[];
  activeId: string | null;
  onSelect: (id: string) => void;
  /** save chapters changed outside the open editor (book-wide replace, smart quotes) */
  onEditChapters: (edits: ChapterEdit[]) => Promise<void>;
  settings: EditorSettings;
  onSettings: (s: EditorSettings) => void;
  bookId: string;
  role: CollabRole;
  /** shared book: other chapters may be open live elsewhere, so edits stay inside the open one */
  live: boolean;
  me: { id: string; name: string };
  comments: Comment[] | null;
  activeComment: string | null;
  onActiveComment: (id: string | null) => void;
}

const TOOLS: { id: RailPanel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "assistant", label: "Writing assistant", icon: Sparkles },
  { id: "settings", label: "Editor settings", icon: Type },
  { id: "find", label: "Find and replace", icon: Search },
  { id: "quotes", label: "Smart quotes", icon: Quote },
  { id: "changes", label: "Track changes", icon: FileDiff },
  { id: "comments", label: "Comments", icon: MessageSquare },
];

/** Writing tools down the right of the editor, each opening a panel, as in Atticus. */
export function ToolRail(props: RailProps) {
  const { open, onOpen, editor, role, comments, activeId } = props;
  // commenters cannot change the text, so the tools that do are left out
  const tools = TOOLS.filter((t) => role !== "commenter" || t.id !== "quotes");
  const tool = tools.find((t) => t.id === open);
  const changes = useEditorState({ editor, selector: ({ editor: e }) => (e ? listChanges(e.state.doc).length : 0) }) ?? 0;
  const openComments = (comments ?? []).filter((c) => !c.resolved && c.chapter === activeId).length;
  const badge: Partial<Record<RailPanel, number>> = { changes, comments: openComments };
  return (
    <>
      {tool && (
        <aside
          className={cn(
            "flex shrink-0 flex-col border-l border-border bg-card max-xl:absolute max-xl:inset-y-0 max-xl:right-12 max-xl:z-20 max-xl:shadow-xl",
            open === "assistant" ? "w-96 max-sm:w-[calc(100vw-3rem)]" : "w-80",
          )}
          aria-label={tool.label}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-medium">{tool.label}</h2>
            <Button variant="ghost" size="icon-sm" aria-label={`Close ${tool.label.toLowerCase()}`} onClick={() => onOpen(null)}>
              <X />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {open === "assistant" && <AssistantPanel editor={editor} bookId={props.bookId} chapterId={activeId} role={role} />}
            {open === "settings" && <SettingsPanel settings={props.settings} onChange={props.onSettings} />}
            {open === "find" && <FindPanel {...props} />}
            {open === "quotes" && <QuotesPanel {...props} />}
            {open === "changes" && <ChangesPanel editor={editor} role={role} />}
            {open === "comments" && (
              <CommentsPanel
                all={comments}
                editor={editor}
                bookId={props.bookId}
                chapterId={activeId}
                chapters={props.chapters}
                me={props.me}
                role={role}
                active={props.activeComment}
                onActive={props.onActiveComment}
                onSelect={props.onSelect}
              />
            )}
          </div>
        </aside>
      )}
      <nav aria-label="Writing tools" className="flex w-12 shrink-0 flex-col items-center gap-1 border-l border-border bg-card py-2">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-label={t.label}
            title={t.label}
            aria-pressed={open === t.id}
            onClick={() => onOpen(open === t.id ? null : t.id)}
            className={cn(
              "relative grid size-9 place-items-center rounded-md text-ink-2 transition hover:bg-paper-2 hover:text-ink",
              open === t.id && "bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary",
            )}
          >
            <t.icon className="size-[18px]" />
            {!!badge[t.id] && (
              <span className="tabular absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-none font-semibold text-primary-foreground">
                {badge[t.id]}
              </span>
            )}
          </button>
        ))}
      </nav>
    </>
  );
}

/* ---------- editor settings ---------- */

function SettingsPanel({ settings: s, onChange }: { settings: EditorSettings; onChange: (s: EditorSettings) => void }) {
  const set = (p: Partial<EditorSettings>) => onChange({ ...s, ...p });
  return (
    <div className="grid gap-5 text-sm">
      <p className="text-[13px] text-soft">How the page looks while you write. Your printed book and ebook keep the theme from the Format tab.</p>
      <label className="grid gap-1.5">
        <span className="font-medium">Font family</span>
        <select value={s.font} onChange={(e) => set({ font: e.target.value })} className="h-9 rounded-md border border-input bg-card px-2">
          {EDITOR_FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <Slider label="Font size" value={s.size} min={14} max={28} step={1} display={`${s.size}px`} small="A" large="A" onChange={(v) => set({ size: v })} />
      <Slider label="Line height" value={s.lineHeight} min={1.3} max={2.3} step={0.05} display={s.lineHeight.toFixed(2)} small="–" large="+" onChange={(v) => set({ lineHeight: v })} />
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 font-medium">Paragraphs</legend>
        {(
          [
            ["spaced", "Spaced", "A blank line between paragraphs"],
            ["indented", "Indented", "First line indented, like a printed book"],
          ] as const
        ).map(([id, label, hint]) => (
          <label key={id} className="flex cursor-pointer items-start gap-2.5">
            <input type="radio" name="para" className="mt-1 accent-[var(--primary)]" checked={s.paragraphs === id} onChange={() => set({ paragraphs: id })} />
            <span>
              <span className="block">{label}</span>
              <span className="block text-[13px] text-soft">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="flex cursor-pointer items-center gap-2.5">
        <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={s.justified} onChange={(e) => set({ justified: e.target.checked })} />
        Justified text
      </label>
      <Button variant="outline" onClick={() => onChange(DEFAULT_EDITOR_SETTINGS)}>
        Reset to default settings
      </Button>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  small,
  large,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  small: string;
  large: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="flex justify-between">
        <span className="font-medium">{label}</span>
        <span className="tabular text-soft">{display}</span>
      </span>
      <span className="flex items-center gap-3">
        <span className="text-xs text-soft" aria-hidden>
          {small}
        </span>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="min-w-0 flex-1 accent-[var(--primary)]" />
        <span className="text-lg leading-none text-soft" aria-hidden>
          {large}
        </span>
      </span>
    </label>
  );
}

/* ---------- find and replace ---------- */

function words(doc: PMNode): number {
  return doc.textBetween(0, doc.content.size, " ", " ").split(/\s+/).filter(Boolean).length;
}

function docOf(schema: Schema, c: Chapter, editor: Editor | null, activeId: string | null): PMNode | null {
  if (c.id === activeId && editor) return editor.state.doc;
  if (!c.content) return null;
  try {
    return schema.nodeFromJSON(c.content);
  } catch {
    return null;
  }
}

/** Replace every result in a document outside the editor, keeping each match's formatting. */
function replaceInDoc(doc: PMNode, schema: Schema, term: string, replacement: string, o: SearchOptions): PMNode | null {
  const results = searchDocument(doc, term, o);
  if (!results.length) return null;
  const tr = new Transform(doc);
  for (const r of [...results].reverse()) {
    const marks = doc.nodeAt(r.from)?.marks ?? [];
    tr.replaceWith(r.from, r.to, replacement ? schema.text(replacement, marks) : Fragment.empty);
  }
  return tr.doc;
}

function Scope({ value, onChange }: { value: "chapter" | "book"; onChange: (v: "chapter" | "book") => void }) {
  return (
    <div role="tablist" className="grid grid-cols-2 gap-1 rounded-md bg-paper-2 p-1 text-sm">
      {(["chapter", "book"] as const).map((v) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} onClick={() => onChange(v)} className={cn("rounded px-3 py-1.5", value === v ? "bg-card font-medium" : "text-ink-2")}>
          {v === "chapter" ? "This chapter" : "Whole book"}
        </button>
      ))}
    </div>
  );
}

function FindPanel({ editor, chapters, activeId, onSelect, onEditChapters, role, live }: RailProps) {
  const canReplace = role !== "commenter";
  const bookWide = !live && (role === "owner" || role === "cowriter");
  const [scope, setScope] = useState<"chapter" | "book">("chapter");
  const [term, setTerm] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const opts: SearchOptions = { caseSensitive, wholeWord, useRegex: false };

  // keep the editor's highlights in step, including after switching chapter
  useEffect(() => {
    if (!editor) return;
    editor.chain().setCaseSensitive(caseSensitive).setWholeWord(wholeWord).setReplaceTerm(replacement).setSearchTerm(term).run();
  }, [editor, term, replacement, caseSensitive, wholeWord]);
  useEffect(() => () => void editor?.commands.clearSearch(), [editor]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? { count: e.storage.findAndReplace.results.length, index: e.storage.findAndReplace.currentIndex } : null),
  }) ?? { count: 0, index: null };

  const bookHits = useMemo(() => {
    if (scope !== "book" || !term || !editor) return [];
    return chapters
      .map((c) => {
        const doc = docOf(editor.schema, c, editor, activeId);
        const hits = doc ? searchDocument(doc, term, opts) : [];
        const first = hits[0];
        const snippet = doc && first ? doc.textBetween(Math.max(0, first.from - 30), Math.min(doc.content.size, first.to + 40), " ", " ") : "";
        return { c, count: hits.length, snippet };
      })
      .filter((h) => h.count > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, term, caseSensitive, wholeWord, chapters, activeId, editor]);
  const bookTotal = bookHits.reduce((n, h) => n + h.count, 0);

  async function replaceBook() {
    if (!editor || !bookTotal) return;
    if (!confirm(`Replace ${bookTotal} ${bookTotal === 1 ? "match" : "matches"} of “${term}” in ${bookHits.length} ${bookHits.length === 1 ? "section" : "sections"}?`)) return;
    setBusy(true);
    try {
      const edits: ChapterEdit[] = [];
      for (const { c } of bookHits) {
        if (c.id === activeId) {
          editor.commands.replaceAll();
          continue;
        }
        const doc = docOf(editor.schema, c, null, null);
        const next = doc && replaceInDoc(doc, editor.schema, term, replacement, opts);
        if (next) edits.push({ id: c.id, content: next.toJSON() as DocNode, words: words(next) });
      }
      await onEditChapters(edits);
      setNote(`Replaced ${bookTotal} in ${bookHits.length} ${bookHits.length === 1 ? "section" : "sections"}.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 text-sm">
      {bookWide && <Scope value={scope} onChange={setScope} />}
      <p className="text-[13px] text-soft">
        {scope === "chapter" ? `Finding words in: ${chapters.find((c) => c.id === activeId)?.title ?? "this section"}` : `Searching all ${chapters.length} sections of the book.`}
      </p>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="find-term" className="font-medium">
            Find
          </label>
          {scope === "chapter" && (
            <span className="flex items-center gap-1">
              <span className="tabular text-[13px] text-soft">{term ? `${state.count ? (state.index ?? 0) + 1 : 0} of ${state.count}` : ""}</span>
              <Button variant="ghost" size="icon-sm" aria-label="Previous match" onClick={() => editor?.chain().goToPreviousResult().scrollIntoView().run()}>
                <ChevronUp />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Next match" onClick={() => editor?.chain().goToNextResult().scrollIntoView().run()}>
                <ChevronDown />
              </Button>
            </span>
          )}
        </div>
        <Input
          id="find-term"
          autoFocus
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setNote("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") editor?.chain()[e.shiftKey ? "goToPreviousResult" : "goToNextResult"]().scrollIntoView().run();
          }}
        />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" className="accent-[var(--primary)]" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} /> Match the whole word
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" className="accent-[var(--primary)]" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} /> Match case
      </label>
      {canReplace && (
        <div className="grid gap-1.5">
          <label htmlFor="replace-term" className="font-medium">
            Replace with
          </label>
          <Input id="replace-term" value={replacement} onChange={(e) => setReplacement(e.target.value)} />
        </div>
      )}
      {!canReplace ? null : scope === "chapter" ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={!state.count} onClick={() => editor?.chain().replace().scrollIntoView().run()}>
            Replace
          </Button>
          <Button disabled={!state.count} onClick={() => editor?.commands.replaceAll()}>
            Replace all
          </Button>
        </div>
      ) : (
        <>
          <Button disabled={!bookTotal || busy} onClick={replaceBook}>
            Replace all in book{bookTotal ? ` (${bookTotal})` : ""}
          </Button>
          {term && (
            <div className="grid gap-1">
              <p className="text-[13px] text-soft">
                {bookTotal ? `${bookTotal} ${bookTotal === 1 ? "match" : "matches"} in ${bookHits.length} ${bookHits.length === 1 ? "section" : "sections"}` : "No matches in the book."}
              </p>
              <ul className="grid gap-1">
                {bookHits.map((h) => (
                  <li key={h.c.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(h.c.id)}
                      className={cn("w-full rounded-md p-2 text-left hover:bg-paper-2", h.c.id === activeId && "bg-primary-soft hover:bg-primary-soft")}
                    >
                      <span className="flex justify-between gap-2">
                        <span className="truncate font-medium">{h.c.title}</span>
                        <span className="tabular shrink-0 text-soft">{h.count}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-[13px] text-soft">…{h.snippet}…</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      {note && (
        <p role="status" className="text-[13px] text-ok">
          {note}
        </p>
      )}
    </div>
  );
}

/* ---------- smart quotes ---------- */

function QuotesPanel({ editor, chapters, activeId, onSelect, onEditChapters, role, live }: RailProps) {
  const bookWide = !live && (role === "owner" || role === "cowriter");
  const [tab, setTab] = useState<"apply" | "check">("apply");
  const [scope, setScope] = useState<"chapter" | "book">("chapter");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  const counts = useMemo(() => {
    if (!editor) return [];
    return chapters
      .map((c) => {
        const doc = docOf(editor.schema, c, editor, activeId);
        return { c, straight: doc ? straightQuotesIn(doc) : 0 };
      })
      .filter((x) => x.straight > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, chapters, activeId, tick]);

  async function apply() {
    if (!editor) return;
    if (scope === "book" && !confirm(`Curl the quotes in all ${chapters.length} sections? Ctrl+Z only undoes the open chapter.`)) return;
    setBusy(true);
    setNote("");
    try {
      let total = 0;
      // this chapter goes through the editor, so Undo can take it back
      const { tr, changed } = curlQuotesTransform(editor.state.doc, editor.schema, editor.state.tr);
      if (changed) editor.view.dispatch(tr);
      total += changed;
      if (scope === "book") {
        const others = chapters.filter((c) => c.id !== activeId);
        const edits: ChapterEdit[] = [];
        for (const c of others) {
          const doc = docOf(editor.schema, c, null, null);
          if (!doc) continue;
          const r = curlQuotesTransform(doc, editor.schema);
          if (!r.changed) continue;
          total += r.changed;
          edits.push({ id: c.id, content: r.tr.doc.toJSON() as DocNode, words: words(r.tr.doc) });
        }
        await onEditChapters(edits);
      }
      setNote(total ? `Curled ${total} ${total === 1 ? "quote" : "quotes"}.${scope === "chapter" ? " Ctrl+Z undoes it." : ""}` : "Every quote is already curly.");
      setTick((t) => t + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 text-sm">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-md bg-paper-2 p-1">
        {(["apply", "check"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("rounded px-3 py-1.5", tab === t ? "bg-card font-medium" : "text-ink-2")}>
            {t === "apply" ? "Apply" : `Inconsistencies${counts.length ? ` (${counts.length})` : ""}`}
          </button>
        ))}
      </div>
      {tab === "apply" ? (
        <>
          {bookWide && <Scope value={scope} onChange={setScope} />}
          <ul className="grid list-disc gap-2 pl-4 text-[13px] text-ink-2">
            <li>Turns straight quotes (&quot; and &apos;) into curly ones (“ ” ‘ ’) and apostrophes (’).</li>
            <li>Quotes you type are already curled. This fixes text pasted from ChatGPT, Word or Google Docs.</li>
            <li>No quote algorithm is perfect: words like ’tis or ’90s may need a manual touch.</li>
          </ul>
          <Button onClick={apply} disabled={busy || !editor}>
            Apply to {scope === "chapter" ? "this chapter" : "the whole book"}
          </Button>
        </>
      ) : counts.length ? (
        <>
          <p className="text-[13px] text-soft">These sections still have straight quotes mixed in with curly ones.</p>
          <ul className="grid gap-1">
            {counts.map(({ c, straight }) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className={cn("flex w-full justify-between gap-2 rounded-md p-2 text-left hover:bg-paper-2", c.id === activeId && "bg-primary-soft hover:bg-primary-soft")}
                >
                  <span className="truncate">{c.title}</span>
                  <span className="tabular shrink-0 text-soft">{straight} straight</span>
                </button>
              </li>
            ))}
          </ul>
          {bookWide && (
            <Button
              variant="outline"
              onClick={() => {
                setScope("book");
                setTab("apply");
              }}
            >
              Fix them all
            </Button>
          )}
        </>
      ) : (
        <p className="text-[13px] text-ok">Every quote in the book is curly.</p>
      )}
      {note && (
        <p role="status" className="text-[13px] text-ok">
          {note}
        </p>
      )}
    </div>
  );
}
