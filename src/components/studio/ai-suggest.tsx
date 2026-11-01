"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { pb } from "@/lib/pb";
import { SUGGEST, type SuggestKind } from "@/lib/assistant";
import { cn } from "@/lib/utils";

type State = { at: "idle" } | { at: "loading" } | { at: "items"; items: string[]; kept?: boolean } | { at: "error"; error: string; setup?: boolean };

const THINKING = ["Reading your book", "Thinking like a reader", "Trying a few ideas", "Picking the best ones"];

/** Suggestions are kept per book, so a reload or a closed box never means paying for them twice. */
const keyFor = (bookId: string | undefined, kind: SuggestKind) => (bookId ? `jp-suggest:${bookId}:${kind}` : "");
function readKept(key: string): { items: string[]; picked: string | null } | null {
  if (!key) return null;
  try {
    const v = JSON.parse(localStorage.getItem(key) || "null") as { items?: string[]; picked?: string | null } | null;
    return v?.items?.length ? { items: v.items, picked: v.picked ?? null } : null;
  } catch {
    return null;
  }
}
function writeKept(key: string, items: string[], picked: string | null) {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify({ items, picked }));
  } catch {
    // storage full or blocked: suggestions still work, they just aren't kept
  }
}

/**
 * A "Suggest" button beside a field. It asks the writer's own model for a few options and shows
 * them as cards with a "Use this" button. The last batch is kept for this book, so opening the box
 * again shows the same ideas for free; the refresh button asks for new ones.
 */
export function AiSuggest({
  kind,
  bookId,
  context,
  onPick,
  onPickAll,
  label = "Suggest",
  className,
  align = "right",
}: {
  kind: SuggestKind;
  bookId?: string;
  /** what the writer has typed so far, read when the button is pressed */
  context?: () => Record<string, string>;
  onPick: (item: string) => void;
  /** when given, a "Use all" button hands over the whole list (keywords, outlines) */
  onPickAll?: (items: string[]) => void;
  label?: string;
  className?: string;
  align?: "left" | "right";
}) {
  const [state, setState] = useState<State>({ at: "idle" });
  const [picked, setPicked] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const open = state.at !== "idle";
  const key = keyFor(bookId, kind);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setState({ at: "idle" });
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setState({ at: "idle" });
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  useEffect(() => {
    if (state.at !== "loading") return;
    const t = setInterval(() => setTick((n) => n + 1), 1600);
    return () => clearInterval(t);
  }, [state.at]);

  function openBox() {
    const kept = readKept(key);
    if (kept) {
      setPicked(kept.picked);
      setState({ at: "items", items: kept.items, kept: true });
    } else ask();
  }

  async function ask() {
    setState({ at: "loading" });
    setTick(0);
    setPicked(null);
    try {
      const res = await fetch("/api/assistant/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: pb().authStore.token },
        body: JSON.stringify({ kind, bookId, context: context?.() }),
      });
      const body = (await res.json().catch(() => ({}))) as { items?: string[]; error?: string; setup?: boolean };
      if (!res.ok || !body.items) setState({ at: "error", error: body.error || `Request failed (${res.status}).`, setup: body.setup });
      else {
        writeKept(key, body.items, null);
        setState({ at: "items", items: body.items });
      }
    } catch (e) {
      setState({ at: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }

  function use(item: string) {
    onPick(item);
    setPicked(item);
    if (state.at === "items") writeKept(key, state.items, item);
  }

  const long = kind === "description" || kind === "cover";
  const what = SUGGEST[kind].label;
  return (
    <div ref={box} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => (open ? setState({ at: "idle" }) : openBox())}
        aria-expanded={open}
        title={`Suggest ${what} with AI`}
        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-primary hover:bg-primary-soft [&_svg]:size-3.5"
      >
        {state.at === "loading" ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
        {label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={`Suggested ${what}`}
          className={cn(
            "jp-pop absolute top-full z-40 mt-2 grid max-h-[32rem] overflow-hidden rounded-xl border border-border bg-popover text-sm text-ink shadow-2xl",
            long ? "w-[min(36rem,calc(100vw-2rem))]" : "w-[min(24rem,calc(100vw-2rem))]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <style>{`
            .jp-pop { animation: jp-pop .18s cubic-bezier(.2,.8,.2,1) }
            .jp-card { animation: jp-rise .35s cubic-bezier(.2,.8,.2,1) both }
            .jp-shimmer { background: linear-gradient(90deg, var(--color-paper-2, #eee) 0%, var(--color-muted, #f6f3ef) 50%, var(--color-paper-2, #eee) 100%); background-size: 200% 100%; animation: jp-sh 1.2s linear infinite }
            @keyframes jp-pop { from { opacity: 0; transform: translateY(-4px) scale(.98) } }
            @keyframes jp-rise { from { opacity: 0; transform: translateY(8px) } }
            @keyframes jp-sh { to { background-position: -200% 0 } }
            @media (prefers-reduced-motion: reduce) { .jp-pop, .jp-card, .jp-shimmer { animation: none } }
          `}</style>
          <div className="flex items-center gap-2 border-b border-border bg-gradient-to-r from-primary-soft to-transparent px-4 py-3">
            <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
              <Sparkles className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="font-semibold">Ideas for your {what}</p>
              <p className="text-[12px] text-soft">
                {state.at === "loading"
                  ? `${THINKING[tick % THINKING.length]}…`
                  : state.at === "items"
                    ? state.kept
                      ? "Kept from last time, so they cost nothing to see again."
                      : "Saved here for this book. Pick one, or ask for fresh ideas."
                    : "Something went wrong."}
              </p>
            </div>
            {state.at !== "loading" && (
              <button
                type="button"
                onClick={ask}
                title="Get new ideas (uses your AI)"
                aria-label="Get new ideas"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[12.5px] font-medium text-ink-2 hover:border-primary/50 hover:text-primary"
              >
                <RefreshCw className="size-3.5" /> New ideas
              </button>
            )}
            <button type="button" onClick={() => setState({ at: "idle" })} aria-label="Close" className="grid size-8 place-items-center rounded-md text-soft hover:bg-muted hover:text-ink">
              <X className="size-4" />
            </button>
          </div>
          <div className="grid gap-2.5 overflow-y-auto p-3">
            {state.at === "loading" &&
              Array.from({ length: long ? 2 : 4 }, (_, i) => (
                <div key={i} className="grid gap-2 rounded-lg border border-border p-3" style={{ opacity: 1 - i * 0.18 }}>
                  <div className="jp-shimmer h-3 w-11/12 rounded" />
                  <div className="jp-shimmer h-3 w-8/12 rounded" />
                  {long && <div className="jp-shimmer h-3 w-10/12 rounded" />}
                </div>
              ))}
            {state.at === "error" && (
              <div className="grid gap-2 p-1">
                <p className={state.setup ? "text-ink-2" : "text-destructive"}>{state.error}</p>
                {state.setup && (
                  <Link href="/desk/assistant" className="font-medium text-primary hover:underline">
                    Set up the AI assistant
                  </Link>
                )}
              </div>
            )}
            {state.at === "items" && (
              <>
                {state.items.map((item, i) => {
                  const on = picked === item;
                  return (
                    <div
                      key={item}
                      className={cn(
                        "jp-card group grid gap-2 rounded-lg border p-3 transition-colors",
                        on ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/50",
                        !long && "grid-cols-[1fr_auto] items-center",
                      )}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <p className={cn("min-w-0 text-[14px] leading-relaxed text-ink", long && "whitespace-pre-line")}>{item}</p>
                      <button
                        type="button"
                        onClick={() => use(item)}
                        className={cn(
                          "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 justify-self-end rounded-md px-3 text-[12.5px] font-semibold transition-colors",
                          on ? "bg-primary text-primary-foreground" : "border border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground",
                        )}
                      >
                        {on ? (
                          <>
                            <Check className="size-3.5" /> Using this
                          </>
                        ) : (
                          "Use this"
                        )}
                      </button>
                    </div>
                  );
                })}
                {onPickAll && (
                  <button
                    type="button"
                    onClick={() => {
                      onPickAll(state.items);
                      setState({ at: "idle" });
                    }}
                    className="h-9 rounded-md bg-primary text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    Use all {state.items.length}
                  </button>
                )}
              </>
            )}
          </div>
          {state.at === "items" && <p className="border-t border-border px-4 py-2 text-[12px] text-soft">These ideas stay here for this book. You can still edit what you use.</p>}
        </div>
      )}
    </div>
  );
}
