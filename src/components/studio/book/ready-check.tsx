"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, Lightbulb, Loader2, OctagonX, RefreshCw } from "lucide-react";
import { exportInput, fetchCover, fetchImages } from "@/lib/studio";
import { preflightBook, storeReadiness, type Finding, type Level, type StoreStatus } from "@/lib/preflight";
import { cn } from "@/lib/utils";
import type { Workspace } from "./workspace";

interface Result {
  findings: Finding[];
  isbn: { isbn_paperback: string; isbn_ebook: string };
}

async function size(bytes: Uint8Array, type: string): Promise<{ width: number; height: number } | null> {
  try {
    const bmp = await createImageBitmap(new Blob([bytes as BlobPart], { type }));
    const s = { width: bmp.width, height: bmp.height };
    bmp.close();
    return s;
  } catch {
    return null;
  }
}

async function runChecks(bookId: string): Promise<Result> {
  const input = await exportInput(bookId);
  const [cover, images] = await Promise.all([fetchCover(input.book), fetchImages(input)]);
  const sizes = new Map<string, { width: number; height: number }>();
  for (const [src, img] of images) {
    const s = await size(img.bytes, img.mediaType);
    if (s) sizes.set(src, s);
  }
  const coverSize = cover ? await size(cover.bytes, cover.mediaType) : null;
  return {
    findings: preflightBook(input, { cover: input.book.cover ? (coverSize ?? undefined) : null, images: sizes }),
    isbn: { isbn_paperback: input.book.isbn_paperback, isbn_ebook: input.book.isbn_ebook },
  };
}

/** Where to fix a finding: the chapter, or the tab that holds the setting. */
function fixLink(bookId: string, f: Finding): { href: string; label: string } | null {
  const base = `/studio/books/${bookId}`;
  if (f.chapterId) return { href: `${base}?chapter=${f.chapterId}`, label: "Open chapter" };
  if (/^(title|author|description|keywords|language|isbn)/.test(f.id)) return { href: `${base}?tab=details`, label: "Open Book details" };
  if (/cover/.test(f.id)) return { href: `${base}?tab=cover`, label: "Open Cover" };
  if (/^(copyright-page|title-page|empty-book)$/.test(f.id)) return { href: base, label: "Open Write" };
  return null;
}

const ICON: Record<Level, React.ComponentType<{ className?: string }>> = { stop: OctagonX, warn: AlertTriangle, tip: Lightbulb };
const TONE: Record<Level, string> = { stop: "text-destructive", warn: "text-amber-600 dark:text-amber-400", tip: "text-soft" };

function StoreChip({ s }: { s: StoreStatus }) {
  const ok = s.level === "ready" || s.level === "tip";
  const Icon = ok ? CheckCircle2 : ICON[s.level as Level];
  return (
    <li className="min-w-0 rounded-md border border-border bg-paper/60 p-2.5">
      <p className={cn("flex items-center gap-1.5 text-sm font-medium", ok ? "text-emerald-700 dark:text-emerald-400" : TONE[s.level as Level])}>
        <Icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{s.label}</span>
      </p>
      <p className="mt-0.5 text-xs text-soft">{ok ? "Ready" : s.level === "stop" ? "Will be refused" : "Goes through; worth fixing"}</p>
      {s.notes.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-xs text-soft">
          {s.notes.slice(0, 3).map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * "Ready to publish?" at the top of the Export tab: what each store would say about the book
 * right now, and every check with the place to fix it.
 */
export function ReadyCheck({ ws, epubErrors, refreshKey }: { ws: Workspace; epubErrors: number | null; refreshKey: number }) {
  const bookId = ws.book.id;
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [run, setRun] = useState(0);
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    let live = true;
    runChecks(bookId).then(
      (r) => {
        if (!live) return;
        setResult(r);
        setError("");
        setBusy(false);
      },
      (e) => {
        if (!live) return;
        setError(e instanceof Error ? e.message : String(e));
        setBusy(false);
      },
    );
    return () => {
      live = false;
    };
  }, [bookId, run, refreshKey]);

  const again = () => {
    setBusy(true);
    setRun((n) => n + 1);
  };

  const findings = result?.findings ?? [];
  const stores = result ? storeReadiness(findings, result.isbn, epubErrors === null ? null : { errors: epubErrors }) : [];
  const stops = findings.filter((f) => f.level === "stop").length;
  const warns = findings.filter((f) => f.level === "warn").length;
  const tips = findings.filter((f) => f.level === "tip");
  const refused = stores.filter((s) => s.level === "stop");
  const shown = findings.filter((f) => f.level !== "tip" || showTips);

  return (
    <section aria-labelledby="ready-title" className="mb-6 rounded-md bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="ready-title" className="font-medium">
            Ready to publish?
          </h2>
          <p className="mt-0.5 text-sm text-soft" role="status">
            {busy && !result
              ? "Checking your book the way the stores will…"
              : error
                ? `The check couldn't finish: ${error}`
                : stops
                  ? `${stops} ${stops === 1 ? "thing" : "things"} to fix before you upload${warns ? `, and ${warns} worth a look` : ""}.`
                  : refused.length
                    ? `${stores.length - refused.length} of ${stores.length} places will take it now. ${refused.map((s) => s.label).join(" and ")} ${refused.length === 1 ? "needs" : "need"} one more thing, shown on ${refused.length === 1 ? "its" : "their"} card.${warns ? ` ${warns} ${warns === 1 ? "thing" : "things"} below ${warns === 1 ? "is" : "are"} worth fixing first.` : ""}`
                    : warns
                      ? `Nothing will be refused. ${warns} ${warns === 1 ? "thing is" : "things are"} worth fixing first.`
                      : "Everything checks out. Build your files below and upload them."}
          </p>
        </div>
        <button
          type="button"
          onClick={again}
          disabled={busy}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm hover:bg-paper disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />} Check again
        </button>
      </div>

      {result && (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Stores">
            {stores.map((s) => (
              <StoreChip key={s.id} s={s} />
            ))}
          </ul>

          {shown.length > 0 && (
            <ul className="mt-4 divide-y divide-border">
              {shown.map((f) => {
                const Icon = ICON[f.level];
                const fix = fixLink(bookId, f);
                return (
                  <li key={f.id} className="flex gap-3 py-2.5">
                    <Icon className={cn("mt-0.5 size-4 shrink-0", TONE[f.level])} aria-label={f.level === "stop" ? "Must fix" : f.level === "warn" ? "Worth fixing" : "Tip"} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {f.title}
                        <span className="ml-2 text-xs font-normal text-soft">{f.edition === "both" ? "Ebook and print" : f.edition === "ebook" ? "Ebook" : "Print"}</span>
                      </p>
                      <p className="mt-0.5 text-sm text-soft">{f.detail}</p>
                    </div>
                    {fix && (
                      <Link href={fix.href} className="shrink-0 self-center text-sm font-medium text-primary hover:underline">
                        {fix.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {tips.length > 0 && (
            <button type="button" onClick={() => setShowTips((v) => !v)} aria-expanded={showTips} className="mt-2 inline-flex items-center gap-1 text-sm text-soft hover:text-ink">
              <ChevronDown className={cn("size-4 transition-transform", showTips && "rotate-180")} aria-hidden />
              {showTips ? "Hide tips" : `Show ${tips.length} ${tips.length === 1 ? "tip" : "tips"}`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
