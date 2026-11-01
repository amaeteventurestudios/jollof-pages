"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { Bug, Gift, Keyboard, LifeBuoy, Map as MapIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WHATS_NEW, SHORTCUTS, TOUR } from "@/lib/editor-help";
import { cn } from "@/lib/utils";

const SEEN_KEY = "jp-whats-new-seen";

function seenNews(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
}

const mac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const keys = (k: string) => (mac ? k.replace(/Mod/g, "⌘").replace(/Alt/g, "⌥").replace(/Shift/g, "⇧") : k.replace(/Mod/g, "Ctrl"));

/** The help corner at the bottom of the tool rail: what's new, shortcuts, a tour, help and bug reports. */
export function RailHelp() {
  const [open, setOpen] = useState<null | "news" | "keys" | "tour">(null);
  const [seen, setSeen] = useState(seenNews);
  const fresh = seen !== WHATS_NEW[0]?.date;

  const btn =
    "relative flex w-12 flex-col items-center gap-0.5 rounded-md py-1.5 text-ink-2 transition hover:bg-paper-2 hover:text-ink [&_svg]:size-[17px]";
  const label = "text-[10px] leading-none";
  return (
    <div data-tour="help" className="mt-auto flex flex-col items-center gap-1 border-t border-border pt-2 app:hidden" aria-label="Help">
      <button
        type="button"
        className={btn}
        title="What's new"
        onClick={() => {
          setOpen("news");
          setSeen(WHATS_NEW[0]?.date ?? "");
          try {
            localStorage.setItem(SEEN_KEY, WHATS_NEW[0]?.date ?? "");
          } catch {
            // private windows keep no storage
          }
        }}
      >
        <Gift />
        <span className={label}>New</span>
        {fresh && <span className="absolute top-1 right-2.5 size-2 rounded-full bg-primary" aria-label="New updates" />}
      </button>
      <button type="button" className={btn} title="Keyboard shortcuts" onClick={() => setOpen("keys")}>
        <Keyboard />
        <span className={label}>Keys</span>
      </button>
      <button type="button" className={btn} title="Take a tour" onClick={() => setOpen("tour")}>
        <MapIcon />
        <span className={label}>Tour</span>
      </button>
      <a className={btn} title="Help and video guides" href="/desk/help" target="_blank" rel="noopener">
        <LifeBuoy />
        <span className={label}>Help</span>
      </a>
      <a className={btn} title="Report a bug" href="/desk/help?topic=bug" target="_blank" rel="noopener">
        <Bug />
        <span className={label}>Bug</span>
      </a>

      <Dialog open={open === "news"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogTitle>What&apos;s new</DialogTitle>
          <DialogDescription>The latest changes to the Desk.</DialogDescription>
          <ol className="mt-2 grid gap-5">
            {WHATS_NEW.map((n) => (
              <li key={n.date + n.title}>
                <p className="text-xs text-soft">{new Date(n.date + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p>
                <h3 className="mt-0.5 font-medium">{n.title}</h3>
                <ul className="mt-1.5 grid list-disc gap-1 pl-5 text-sm text-ink-2">
                  {n.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "keys"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Work faster without the mouse.</DialogDescription>
          {SHORTCUTS.map((g) => (
            <section key={g.group} className="mt-2">
              <h3 className="text-xs font-medium tracking-wide text-soft uppercase">{g.group}</h3>
              <dl className="mt-1 grid gap-1 text-sm">
                {g.keys.map(([k, what]) => (
                  <div key={k} className="flex items-center justify-between gap-4 border-b border-border/60 py-1">
                    <dt className="text-ink-2">{what}</dt>
                    <dd>
                      <kbd className="rounded border border-border bg-paper-2 px-1.5 py-0.5 font-mono text-xs">{keys(k)}</kbd>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </DialogContent>
      </Dialog>

      {open === "tour" && <Tour onDone={() => setOpen(null)} />}
    </div>
  );
}

/** A short walk round the writing screen, pointing at each part in turn. */
function Tour({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const s = TOUR[step];

  useLayoutEffect(() => {
    const find = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${s.target}"]`);
      const r = el?.getBoundingClientRect();
      setRect(r && r.width > 0 ? r : null);
    };
    find();
    window.addEventListener("resize", find);
    return () => window.removeEventListener("resize", find);
  }, [s.target]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
      if (e.key === "ArrowRight" && step < TOUR.length - 1) setStep(step + 1);
      if (e.key === "ArrowLeft" && step > 0) setStep(step - 1);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onDone, step]);

  // the card sits beside the part it describes, inside the window
  const card = 320;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  let left = vw / 2 - card / 2;
  let top = vh / 2 - 100;
  if (rect) {
    const roomRight = vw - rect.right;
    if (roomRight > card + 24) left = rect.right + 16;
    else if (rect.left > card + 24) left = rect.left - card - 16;
    else left = Math.min(Math.max(16, rect.left), vw - card - 16);
    top = Math.min(Math.max(16, rect.top + (rect.height > 300 ? 40 : 0)), vh - 240);
    if (roomRight <= card + 24 && rect.left <= card + 24) top = Math.min(rect.bottom + 12, vh - 240);
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Tour of the writing screen">
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-md ring-2 ring-primary transition-all duration-300"
          style={{ left: rect.left - 4, top: rect.top - 4, width: rect.width + 8, height: rect.height + 8, boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.45)" }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/45" />
      )}
      <div className="absolute rounded-lg border border-border bg-popover p-4 shadow-xl transition-all duration-300" style={{ left, top, width: card }}>
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-medium">{s.title}</h2>
          <button type="button" aria-label="End the tour" onClick={onDone} className="-mt-1 -mr-1 grid size-7 place-items-center rounded text-ink-2 hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <p className="mt-1.5 text-sm text-ink-2">{s.text}</p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1" aria-label={`Step ${step + 1} of ${TOUR.length}`}>
            {TOUR.map((t, i) => (
              <span key={t.target + i} className={cn("size-1.5 rounded-full", i === step ? "bg-primary" : "bg-border")} />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button size="sm" variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <Button size="sm" autoFocus onClick={() => (step < TOUR.length - 1 ? setStep(step + 1) : onDone())}>
              {step < TOUR.length - 1 ? "Next" : "Done"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
