"use client";

import { useEffect, useMemo, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { Bookmark, CheckCircle2, FlaskConical, MessageSquare, MessageSquarePlus, RotateCcw, SearchCheck, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { anchorFor, indexText, locate, type CommentAnchor } from "@/components/studio/comment-highlights";
import { errorMessage, pb } from "@/lib/pb";
import type { CollabRole } from "@/lib/collab";
import type { Chapter } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface Comment extends CommentAnchor {
  book: string;
  chapter: string;
  author: string;
  author_name: string;
  body: string;
  replies: { author: string; author_name: string; body: string; at: string }[] | null;
  resolved: boolean;
  created: string;
  /** empty for a plain comment */
  kind?: NoteKind | "";
}

export type NoteKind = "research" | "factcheck" | "bookmark";

const KINDS: { id: NoteKind | ""; label: string; icon: React.ComponentType<{ className?: string }>; color: string; placeholder: string; fallback?: string }[] = [
  { id: "", label: "Comment", icon: MessageSquare, color: "border-[#e2b33c]", placeholder: "Your comment" },
  { id: "research", label: "Research note", icon: FlaskConical, color: "border-sky-500", placeholder: "Sources, links, what to look into…" },
  { id: "factcheck", label: "Fact-check", icon: SearchCheck, color: "border-red-500", placeholder: "What needs checking (optional)", fallback: "Check this fact." },
  { id: "bookmark", label: "Bookmark", icon: Bookmark, color: "border-emerald-500", placeholder: "A name for this place (optional)", fallback: "Bookmark" },
];
const kindOf = (k: string | undefined) => KINDS.find((x) => x.id === (k ?? "")) ?? KINDS[0];

// the editor's menus open the panel on a kind of note
let pendingKind: NoteKind | "" | null = null;
export function askForNote(kind: NoteKind | "") {
  pendingKind = kind;
  window.dispatchEvent(new CustomEvent("jp-note-kind", { detail: kind }));
}

function when(iso: string) {
  const d = new Date(iso.replace(" ", "T"));
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/**
 * Every comment on a book, kept up to date as others add, answer and resolve them, with the open
 * chapter's comments highlighted in the editor.
 */
export function useBookComments(bookId: string, editor: Editor | null, chapterId: string | null, active: string | null): Comment[] | null {
  const [all, setAll] = useState<Comment[] | null>(null);

  useEffect(() => {
    let off: (() => void) | undefined;
    let stopped = false;
    const filter = pb().filter("book = {:b}", { b: bookId });
    pb()
      .collection("comments")
      .getFullList<Comment>({ filter, sort: "created" })
      .then((list) => !stopped && setAll(list))
      .catch(() => !stopped && setAll([]));
    pb()
      .collection("comments")
      .subscribe<Comment>(
        "*",
        (e) =>
          setAll((list) => {
            const rest = (list ?? []).filter((c) => c.id !== e.record.id);
            return e.action === "delete" ? rest : [...rest, e.record].sort((a, b) => a.created.localeCompare(b.created));
          }),
        { filter },
      )
      .then((u) => {
        if (stopped) void u();
        else off = u;
      })
      .catch(() => undefined);
    return () => {
      stopped = true;
      void off?.();
    };
  }, [bookId]);

  const here = useMemo(() => (all ?? []).filter((c) => c.chapter === chapterId), [all, chapterId]);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setComments(here, active);
  }, [editor, here, active]);

  return all;
}

/** Comments on the open chapter: add one on the selected words, reply, resolve. Live for everyone on the book. */
export function CommentsPanel({
  all,
  editor,
  bookId,
  chapterId,
  chapters,
  me,
  role,
  active,
  onActive,
  onSelect,
}: {
  all: Comment[] | null;
  editor: Editor | null;
  bookId: string;
  chapterId: string | null;
  chapters: Chapter[];
  me: { id: string; name: string };
  role: CollabRole;
  active: string | null;
  onActive: (id: string | null) => void;
  onSelect: (chapterId: string) => void;
}) {
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [show, setShow] = useState<"open" | "resolved">("open");
  const [kind, setKind] = useState<NoteKind | "">(() => {
    const k = pendingKind ?? "";
    pendingKind = null;
    return k;
  });
  const [filter, setFilter] = useState<NoteKind | "" | "all">("all");
  useEffect(() => {
    const on = (e: Event) => {
      pendingKind = null;
      setKind((e as CustomEvent<NoteKind | "">).detail);
    };
    window.addEventListener("jp-note-kind", on);
    return () => window.removeEventListener("jp-note-kind", on);
  }, []);
  const selection = useEditorState({
    editor,
    selector: ({ editor: e }) => (e && !e.state.selection.empty ? anchorFor(e.state.doc, e.state.selection.from, e.state.selection.to) : null),
    equalityFn: (a, b) => a?.quote === b?.quote && a?.prefix === b?.prefix,
  });

  const here = useMemo(() => (all ?? []).filter((c) => c.chapter === chapterId), [all, chapterId]);

  // jump to the words of the comment chosen in the text or the list
  useEffect(() => {
    if (!editor || !active) return;
    const c = here.find((x) => x.id === active);
    const at = c && locate(indexText(editor.state.doc), c);
    if (at) editor.chain().setTextSelection(at).scrollIntoView().run();
    document.getElementById(`comment-${active}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active, editor, here]);

  const k = kindOf(kind);
  async function add() {
    const body = draft.trim() || k.fallback || "";
    if (!selection || !body || !chapterId) return;
    setError("");
    try {
      const c = await pb()
        .collection("comments")
        .create<Comment>({ book: bookId, chapter: chapterId, author: me.id, author_name: me.name, ...selection, body, kind, replies: [], resolved: false });
      setDraft("");
      setShow("open");
      onActive(c.id);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const others = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of all ?? []) if (!c.resolved && c.chapter !== chapterId) counts.set(c.chapter, (counts.get(c.chapter) ?? 0) + 1);
    return chapters.filter((ch) => counts.has(ch.id)).map((ch) => ({ ch, n: counts.get(ch.id)! }));
  }, [all, chapters, chapterId]);

  const shown = here.filter((c) => (show === "open" ? !c.resolved : c.resolved) && (filter === "all" || (c.kind ?? "") === filter));
  const open = here.filter((c) => !c.resolved).length;

  return (
    <div className="grid gap-4">
      <div className="border border-border p-3">
        {selection ? (
          <>
            <p className="line-clamp-2 border-l-2 border-primary pl-2 text-[13px] text-ink-2 italic">{selection.quote}</p>
            <div role="radiogroup" aria-label="Kind of note" className="mt-2 flex flex-wrap gap-1">
              {KINDS.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  role="radio"
                  aria-checked={kind === x.id}
                  onClick={() => setKind(x.id)}
                  className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs", kind === x.id ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-2 hover:border-primary")}
                >
                  <x.icon className="size-3" /> {x.label}
                </button>
              ))}
            </div>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
              }}
              rows={3}
              placeholder={k.placeholder}
              className="mt-2"
              aria-label="Comment"
            />
            <Button size="sm" className="mt-2" disabled={!draft.trim() && !k.fallback} onClick={add}>
              <k.icon /> {kind ? `Add ${k.label.toLowerCase()}` : "Comment"}
            </Button>
          </>
        ) : (
          <p className="flex items-start gap-2 text-sm text-soft">
            <MessageSquarePlus className="mt-0.5 size-4 shrink-0 text-primary" />
            Select some words in the chapter to comment on them.
          </p>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div role="tablist" aria-label="Which comments" className="grid grid-cols-2 border border-border p-0.5">
        {(["open", "resolved"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={show === k}
            onClick={() => setShow(k)}
            className={cn("h-8 text-sm", show === k ? "bg-primary text-primary-foreground" : "text-ink-2 hover:bg-paper")}
          >
            {k === "open" ? `Open (${open})` : `Resolved (${here.length - open})`}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1" role="group" aria-label="Show">
        {[{ id: "all" as const, label: "All" }, ...KINDS.map((x) => ({ id: x.id, label: x.id ? `${x.label}s` : "Comments" }))].map((f) => {
          const n = f.id === "all" ? null : here.filter((c) => !c.resolved && (c.kind ?? "") === f.id).length;
          return (
            <button
              key={f.id || "comment"}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn("rounded-full border px-2 py-0.5 text-xs", filter === f.id ? "border-primary bg-primary-soft text-primary" : "border-border text-ink-2 hover:border-primary")}
            >
              {f.label}
              {n ? ` · ${n}` : ""}
            </button>
          );
        })}
      </div>

      {!all ? (
        <p className="text-sm text-soft">Loading comments…</p>
      ) : !shown.length ? (
        <p className="text-sm text-soft">{show === "open" ? "No open comments in this chapter." : "Nothing resolved yet."}</p>
      ) : (
        <ol className="grid gap-2">
          {shown.map((c) => (
            <CommentCard key={c.id} c={c} me={me} role={role} active={c.id === active} onActive={() => onActive(c.id === active ? null : c.id)} onError={setError} />
          ))}
        </ol>
      )}

      {others.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold tracking-[0.08em] text-soft uppercase">Open in other chapters</h3>
          <ul className="mt-2 grid gap-1">
            {others.map(({ ch, n }) => (
              <li key={ch.id}>
                <button type="button" onClick={() => onSelect(ch.id)} className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-sm hover:bg-paper">
                  <span className="truncate">{ch.title}</span>
                  <span className="tabular shrink-0 bg-primary-soft px-1.5 text-xs text-primary">{n}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CommentCard({
  c,
  me,
  role,
  active,
  onActive,
  onError,
}: {
  c: Comment;
  me: { id: string; name: string };
  role: CollabRole;
  active: boolean;
  onActive: () => void;
  onError: (m: string) => void;
}) {
  const [reply, setReply] = useState("");
  const replies = c.replies ?? [];
  const update = (patch: Partial<Comment>) =>
    pb()
      .collection("comments")
      .update(c.id, patch)
      .catch((e) => onError(errorMessage(e)));

  return (
    <li id={`comment-${c.id}`} className={cn("border bg-card transition-colors", active ? "border-primary shadow-sm" : "border-border")}>
      <button type="button" onClick={onActive} className="block w-full px-3 pt-2.5 pb-2 text-left hover:bg-paper">
        <span className={cn("line-clamp-1 border-l-2 pl-2 text-[13px] text-soft italic", kindOf(c.kind).color)}>{c.quote}</span>
        <span className="mt-1.5 flex items-baseline justify-between gap-2 text-xs">
          <span className="flex items-center gap-1 font-medium text-ink">
            {(() => {
              const K = kindOf(c.kind);
              return c.kind ? (
                <span className="inline-flex items-center gap-0.5 text-soft">
                  <K.icon className="size-3" /> {K.label} ·
                </span>
              ) : null;
            })()}
            {c.author === me.id ? "You" : c.author_name}
          </span>
          <span className="text-soft">{when(c.created)}</span>
        </span>
        <span className="mt-0.5 block text-sm whitespace-pre-wrap text-ink">{c.body}</span>
      </button>
      {replies.length > 0 && (
        <ol className="grid gap-2 border-t border-border px-3 py-2">
          {replies.map((r, i) => (
            <li key={i} className="text-sm">
              <span className="text-xs font-medium">{r.author === me.id ? "You" : r.author_name}</span> <span className="text-xs text-soft">{when(r.at)}</span>
              <p className="whitespace-pre-wrap text-ink">{r.body}</p>
            </li>
          ))}
        </ol>
      )}
      {active && (
        <div className="grid gap-2 border-t border-border p-2">
          {!c.resolved && (
            <div className="flex gap-1">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && reply.trim()) {
                    update({ replies: [...replies, { author: me.id, author_name: me.name, body: reply.trim(), at: new Date().toISOString() }] });
                    setReply("");
                  }
                }}
                placeholder="Reply"
                aria-label="Reply"
                className="h-8 min-w-0 flex-1 border border-input px-2 text-sm"
              />
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Send reply"
                disabled={!reply.trim()}
                onClick={() => {
                  update({ replies: [...replies, { author: me.id, author_name: me.name, body: reply.trim(), at: new Date().toISOString() }] });
                  setReply("");
                }}
              >
                <Send />
              </Button>
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="ghost" onClick={() => update({ resolved: !c.resolved })}>
              {c.resolved ? <RotateCcw /> : <CheckCircle2 />} {c.resolved ? "Reopen" : "Resolve"}
            </Button>
            {(c.author === me.id || role === "owner") && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (confirm("Delete this comment and its replies?"))
                    pb()
                      .collection("comments")
                      .delete(c.id)
                      .catch((e) => onError(errorMessage(e)));
                }}
              >
                <Trash2 /> Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
