"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Check, Copy, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pb } from "@/lib/pb";
import { aiAction, plainMarks, textToDoc, wordDiff, type AiAction } from "@/lib/ai-actions";
import { boxDef } from "@/lib/blocks";
import type { EditorTool } from "./context-menu";
import { cn } from "@/lib/utils";

/** Ask for one of the AI tools on the current selection or cursor. The review card picks it up. */
export function runAi(editor: Editor, id: string, option?: string) {
  editor.view.dom.dispatchEvent(new CustomEvent("jp-ai", { detail: { id, option } }));
}

interface Run {
  action: AiAction;
  option?: string;
  from: number;
  to: number;
  original: string;
  before: string;
  text: string;
  status: "writing" | "done" | "error";
  error?: string;
  setup?: boolean;
  model?: string;
}

type View = "changes" | "suggested" | "original";

/**
 * The card an AI suggestion arrives in: the original, the suggestion and what changed, with
 * Accept, Try again and Reject. Accepting is one step, so Undo takes it back.
 */
export function AiReview({ editor, bookId, chapterId, onTool }: { editor: Editor; bookId: string; chapterId: string; onTool?: (t: EditorTool) => void }) {
  const [run, setRun] = useState<Run | null>(null);
  const [view, setView] = useState<View>("changes");
  const abort = useRef<AbortController | null>(null);
  const card = useRef<HTMLDivElement>(null);

  async function start(r: Run) {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setRun(r);
    setView(r.action.output === "replace" ? "changes" : "suggested");
    try {
      const res = await fetch("/api/assistant/action", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json", Authorization: pb().authStore.token },
        body: JSON.stringify({ bookId, chapterId, action: r.action.id, option: r.option, selection: r.original, before: r.before }),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; setup?: boolean };
        setRun({ ...r, status: "error", error: body.error || `The AI could not answer (${res.status}).`, setup: body.setup });
        return;
      }
      const model = decodeURIComponent(res.headers.get("X-Model") || "");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setRun({ ...r, text, model });
      }
      setRun({ ...r, text: text.trim(), model, status: text.trim() ? "done" : "error", error: text.trim() ? undefined : "The AI sent back nothing. Try again." });
    } catch (e) {
      if (!ctrl.signal.aborted) setRun({ ...r, status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }

  // the menus and the toolbar ask through an event on the editor
  const startRef = useRef(start);
  useEffect(() => {
    startRef.current = start;
  });
  useEffect(() => {
    const dom = editor.view.dom;
    const h = (e: Event) => {
      const { id, option } = (e as CustomEvent<{ id: string; option?: string }>).detail;
      const action = aiAction(id);
      if (!action) return;
      const { from, to, empty } = editor.state.selection;
      if (action.needs === "selection" && empty) return;
      const doc = editor.state.doc;
      void startRef.current({
        action,
        option,
        from,
        to,
        original: empty ? "" : doc.textBetween(from, to, "\n\n"),
        before: doc.textBetween(0, to, "\n\n").slice(-6000),
        text: "",
        status: "writing",
      });
    };
    dom.addEventListener("jp-ai", h);
    return () => dom.removeEventListener("jp-ai", h);
  }, [editor]);

  useEffect(() => () => abort.current?.abort(), []);

  function close() {
    abort.current?.abort();
    setRun(null);
    editor.commands.focus();
  }

  function accept() {
    if (!run || run.status !== "done") return;
    const { state } = editor;
    const { action, from, to, original } = run;
    if (to > state.doc.content.size || (original && state.doc.textBetween(from, to, "\n\n") !== original)) {
      setRun({ ...run, status: "error", error: "The text changed while the AI was writing. Select it again and try once more." });
      return;
    }
    const nodes = textToDoc(run.text);
    if (!nodes.length) return;
    const $to = state.doc.resolve(to);
    // the end of the paragraph (or block) the selection ends in
    const after = $to.depth ? $to.after(1) : to;
    const chain = editor.chain().focus();
    if (action.output === "replace") {
      const $from = state.doc.resolve(from);
      const oneLine = nodes.length === 1 && nodes[0].type === "paragraph" && $from.sameParent($to) && $from.parent.isTextblock;
      chain.insertContentAt({ from, to }, oneLine ? (nodes[0].content ?? []) : nodes);
    } else if (action.output === "after") {
      chain.insertContentAt(after, nodes);
    } else if (action.output === "block" && action.block) {
      chain.insertContentAt(after, { type: "box", attrs: { variant: action.block }, content: nodes });
    }
    chain.run();
    setRun(null);
  }

  useEffect(() => {
    if (!run) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[data-radix-menu-content]")) {
        e.preventDefault();
        close();
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && run.status === "done" && run.action.output !== "note") {
        e.preventDefault();
        accept();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  });

  if (!run) return null;
  const { action } = run;
  const label = action.options && run.option ? `${action.label}: ${run.option}` : action.label;
  const where =
    action.output === "replace"
      ? "Replaces the selected words"
      : action.output === "after"
        ? "Goes after the paragraph"
        : action.output === "block"
          ? `Adds a ${boxDef(action.block).label.toLowerCase()} block after the paragraph`
          : "For you to read; nothing is added to the book";
  const views: View[] = action.output === "replace" ? ["changes", "suggested", "original"] : action.output === "note" ? ["suggested"] : ["suggested", "original"];
  const shown = views.includes(view) ? view : views[0];

  return (
    <div
      ref={card}
      role="dialog"
      aria-label={`AI suggestion: ${label}`}
      className="fixed bottom-6 left-1/2 z-40 flex max-h-[60vh] w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 flex-col rounded-lg border border-border bg-popover shadow-2xl app:bottom-[calc(var(--app-tab-h)+env(safe-area-inset-bottom)+0.75rem)]"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Sparkles className="size-4 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="truncate text-xs text-soft">
            {where}
            {run.model ? ` · ${run.model}` : ""}
          </p>
        </div>
        <button type="button" onClick={close} aria-label="Close" className="grid size-7 place-items-center rounded text-ink-2 hover:bg-muted">
          <X className="size-4" />
        </button>
      </div>

      {views.length > 1 && run.status !== "error" && (
        <div role="tablist" aria-label="What to show" className="flex gap-1 px-4 pt-2">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={shown === v}
              onClick={() => setView(v)}
              className={cn("rounded-full px-2.5 py-0.5 text-xs", shown === v ? "bg-primary-soft text-primary" : "text-ink-2 hover:bg-muted")}
            >
              {v === "changes" ? "Changes" : v === "suggested" ? "Suggestion" : "Original"}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-16 flex-1 overflow-y-auto px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap" aria-live="polite">
        {run.status === "error" ? (
          <div className="grid gap-3 text-sm whitespace-normal">
            <p className="text-destructive">{run.error}</p>
            {run.setup && (
              <Button size="sm" variant="outline" className="justify-self-start" onClick={() => onTool?.("assistant")}>
                Set up the writing assistant
              </Button>
            )}
          </div>
        ) : shown === "original" ? (
          <p className="text-ink-2">{run.original || run.before.slice(-600) || "(nothing yet)"}</p>
        ) : shown === "changes" && run.status === "done" ? (
          <p>
            {wordDiff(run.original, plainMarks(run.text)).map((d, i) =>
              d.kind === "same" ? (
                <span key={i}>{d.text}</span>
              ) : d.kind === "add" ? (
                <ins key={i} className="bg-emerald-100 text-emerald-900 no-underline dark:bg-emerald-950 dark:text-emerald-200">
                  {d.text}
                </ins>
              ) : (
                <del key={i} className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                  {d.text}
                </del>
              ),
            )}
          </p>
        ) : (
          <p>
            {plainMarks(run.text)}
            {run.status === "writing" && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-middle" aria-hidden />}
          </p>
        )}
        {run.status === "writing" && !run.text && (
          <p className="flex items-center gap-2 text-sm text-soft">
            <Loader2 className="size-4 animate-spin" /> Writing…
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">
        {action.output === "note" ? (
          <Button size="sm" disabled={run.status !== "done"} onClick={() => void navigator.clipboard.writeText(plainMarks(run.text)).catch(() => undefined)}>
            <Copy /> Copy
          </Button>
        ) : (
          <Button size="sm" disabled={run.status !== "done"} onClick={accept}>
            <Check /> Accept
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={run.status === "writing"} onClick={() => void start({ ...run, text: "", status: "writing", error: undefined })}>
          <RotateCcw /> Try again
        </Button>
        <Button size="sm" variant="ghost" onClick={close}>
          {action.output === "note" ? "Close" : "Reject"}
        </Button>
        <span className="ml-auto text-xs text-soft max-sm:hidden">{action.output === "note" ? "Esc to close" : "⌘/Ctrl+Enter accepts · Esc rejects · Undo works after"}</span>
      </div>
    </div>
  );
}
