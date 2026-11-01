"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { pb } from "@/lib/pb";
import { SUGGEST, type SuggestKind } from "@/lib/assistant";
import { cn } from "@/lib/utils";

type State = { at: "idle" } | { at: "loading" } | { at: "items"; items: string[] } | { at: "error"; error: string; setup?: boolean };

/**
 * A small "Suggest" button beside a field. It asks the writer's own model for a few options and
 * shows them in a list; picking one fills the field. Nothing changes until the writer picks.
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
  const box = useRef<HTMLDivElement>(null);
  const open = state.at !== "idle";

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

  async function ask() {
    setState({ at: "loading" });
    setPicked(null);
    try {
      const res = await fetch("/api/assistant/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: pb().authStore.token },
        body: JSON.stringify({ kind, bookId, context: context?.() }),
      });
      const body = (await res.json().catch(() => ({}))) as { items?: string[]; error?: string; setup?: boolean };
      if (!res.ok || !body.items) setState({ at: "error", error: body.error || `Request failed (${res.status}).`, setup: body.setup });
      else setState({ at: "items", items: body.items });
    } catch (e) {
      setState({ at: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }

  const long = kind === "description" || kind === "cover";
  return (
    <div ref={box} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => (open ? setState({ at: "idle" }) : ask())}
        aria-expanded={open}
        title={`Suggest ${SUGGEST[kind].label} with AI`}
        className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-primary hover:bg-primary-soft [&_svg]:size-3.5"
      >
        {state.at === "loading" ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
        {label}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={`Suggested ${SUGGEST[kind].label}`}
          className={cn(
            "absolute top-full z-40 mt-1 grid max-h-[26rem] gap-2 overflow-y-auto rounded-md border border-border bg-popover p-3 text-sm text-ink shadow-xl",
            long ? "w-[min(34rem,calc(100vw-2rem))]" : "w-[min(22rem,calc(100vw-2rem))]",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            <span className="flex-1 text-[12.5px] font-medium text-soft uppercase tracking-wide">Suggested {SUGGEST[kind].label}</span>
            {state.at !== "loading" && (
              <button type="button" onClick={ask} title="Try again" aria-label="Suggest again" className="grid size-6 place-items-center rounded text-soft hover:bg-muted hover:text-ink">
                <RefreshCw className="size-3.5" />
              </button>
            )}
            <button type="button" onClick={() => setState({ at: "idle" })} aria-label="Close" className="grid size-6 place-items-center rounded text-soft hover:bg-muted hover:text-ink">
              <X className="size-3.5" />
            </button>
          </div>
          {state.at === "loading" && (
            <p className="py-3 text-soft" role="status">
              Thinking of some {SUGGEST[kind].label}…
            </p>
          )}
          {state.at === "error" && (
            <div className="grid gap-2 py-1">
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
              <ul className="grid gap-1">
                {state.items.map((item) => (
                  <li key={item}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(item);
                        setPicked(item);
                      }}
                      className={cn("flex w-full items-start gap-2 rounded px-2 py-1.5 text-left hover:bg-muted", picked === item && "bg-primary-soft")}
                    >
                      <span className={cn("min-w-0 flex-1", long && "whitespace-pre-line")}>{item}</span>
                      {picked === item && <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-label="Used" />}
                    </button>
                  </li>
                ))}
              </ul>
              {onPickAll && (
                <button
                  type="button"
                  onClick={() => {
                    onPickAll(state.items);
                    setState({ at: "idle" });
                  }}
                  className="h-8 rounded-md border border-primary/60 text-[13px] font-medium text-primary hover:bg-primary-soft"
                >
                  Use all {state.items.length}
                </button>
              )}
              <p className="text-[12px] text-soft">Click one to use it. You can still edit it afterwards.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
