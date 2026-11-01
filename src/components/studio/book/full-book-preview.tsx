"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, X } from "lucide-react";
import { elementHtml } from "@/lib/render-element";
import { orderedElements } from "@/lib/book-model";
import { headTitles, pageChrome, runningHeads, type PageChrome } from "@/lib/running-heads";
import { PageHead } from "./page-head";
import { themeCss } from "@/lib/theme-css";
import { themeFor, THEME_FONTS_HREFS } from "@/lib/themes";
import { getTrim, hardcoverTrim, pageGeometry, type Binding } from "@/lib/kdp";
import { bookFormat, type Book, type Chapter } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Points to CSS pixels: the page is drawn at 72 px per inch, so a 11 pt font is 11 px before scaling. */
const PPI = 72;
const GAP = 48;
const TURN_MS = 620;

/** One printed page: part of an element's text, or a blank left so the next chapter opens on the right. */
interface Page {
  el: number;
  /** which page of the element, from 0 */
  k: number;
  blank: boolean;
  /** printed folio, empty when the page shows none */
  folio: string;
  head: string;
  chrome?: PageChrome;
}

/** A short fingerprint of the text, so the layout is redone only when the book changes. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function roman(n: number): string {
  const map: [number, string][] = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];
  let out = "";
  for (const [v, s] of map)
    while (n >= v) {
      out += s;
      n -= v;
    }
  return out;
}

/**
 * The whole printed book, two pages at a time with turning pages, at the book's trim size and in its
 * interior theme. Pages are laid out the way the PDF export does: chapters open on the right when
 * that option is on, front matter is numbered in roman, the body from 1, and running heads skip
 * chapter openings.
 */
export function FullBookPreview({ book, chapters, startChapterId, onClose }: { book: Book; chapters: Chapter[]; startChapterId: string | null; onClose: () => void }) {
  const base = bookFormat(book);
  const [binding, setBinding] = useState<Binding>("paperback");
  const format = base;
  const editionTrim = binding === "hardcover" ? hardcoverTrim(base.hardcoverTrim || base.trim).id : base.trim;
  const theme = themeFor(format);
  const elements = orderedElements(chapters, theme).filter((e) => format.printToc || e.kind.id !== "contents");
  const htmls = elements.map((e) => elementHtml(e, { book, author: book.expand?.author ?? null, alsoBy: [] }, elements, theme));
  const css = themeCss(theme, { scope: ".jp-preview", dropCaps: format.dropCaps, lineHeight: format.lineHeight });

  const trim = getTrim(editionTrim);
  const g = pageGeometry(editionTrim, (binding === "hardcover" ? book.hardcover_page_count : book.page_count) || 200, false, binding, format.margins);
  const W = trim.width * PPI;
  const H = trim.height * PPI;
  const m = { top: g.margins.top * PPI, bottom: g.margins.bottom * PPI, inside: g.margins.inside * PPI, outside: g.margins.outside * PPI };
  const innerW = W - m.inside - m.outside;
  const innerH = H - m.top - m.bottom;
  const text = format.largePrint ? 16 : format.fontSize;

  // 1. measure: lay every element out in hidden columns and count the pages it fills
  // results are keyed by layout, so a change of edition simply shows "preparing" again
  const [result, setResult] = useState<{ key: string; counts: number[] } | null>(null);
  const [progress, setProgress] = useState({ key: "", n: 0 });
  const measureRef = useRef<HTMLDivElement>(null);
  const layoutKey = `${binding}|${innerW}|${innerH}|${text}|${htmls.length}|${hash(htmls.join("\u0000"))}`;
  const counts = result?.key === layoutKey ? result.counts : null;
  const measured = progress.key === layoutKey ? progress.n : 0;
  useEffect(() => {
    let live = true;
    const settle = (im: HTMLImageElement) =>
      new Promise<void>((done) => {
        im.addEventListener("load", () => done(), { once: true });
        im.addEventListener("error", () => done(), { once: true });
      });
    (async () => {
      await document.fonts?.ready;
      const host = measureRef.current;
      if (!host) return;
      const out: number[] = [];
      for (let i = 0; i < htmls.length; i++) {
        if (!live) return;
        host.innerHTML = htmls[i];
        const waiting = [...host.querySelectorAll("img")].filter((im) => !im.complete);
        if (waiting.length) await Promise.race([Promise.all(waiting.map(settle)), new Promise((r) => setTimeout(r, 3000))]);
        out.push(Math.max(1, Math.round((host.scrollWidth + GAP) / (innerW + GAP))));
        setProgress({ key: layoutKey, n: i + 1 });
        // let the progress bar paint between elements
        if (i % 3 === 2) await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      host.innerHTML = "";
      if (live) setResult({ key: layoutKey, counts: out });
    })();
    return () => {
      live = false;
    };
    // the key stands for everything that changes how the text flows, including the text itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutKey]);

  // 2. paginate: blanks to open chapters on the right, folios and running heads
  const pages: Page[] = (() => {
    if (!counts) return [];
    const list: Page[] = [];
    let bodyFrom = -1;
    elements.forEach((e, i) => {
      const firstBody = bodyFrom < 0 && e.section !== "front";
      const right = (format.chaptersOnRight || (firstBody && format.firstChapterOnRight !== false)) && e.kind.id !== "copyright";
      if (i > 0 && right && list.length % 2 === 1) list.push({ el: i - 1, k: -1, blank: true, folio: "", head: "" });
      if (firstBody) bodyFrom = list.length;
      for (let k = 0; k < counts[i]; k++) list.push({ el: i, k, blank: false, folio: "", head: "" });
    });
    const rh = runningHeads(format);
    const titles = headTitles(elements);
    const author = book.expand?.author?.name ?? "";
    return list.map((p, idx) => {
      if (p.blank) return p;
      const e = elements[p.el];
      const body = bodyFrom >= 0 && idx >= bodyFrom;
      const n = format.countFrontMatter ? String(idx + 1) : body ? String(idx - bodyFrom + 1) : roman(idx + 1);
      const chrome = pageChrome(rh, {
        recto: idx % 2 === 0,
        opener: p.k === 0,
        front: e.section === "front",
        hideHead: e.options.hideHeader,
        hideFolio: e.options.hidePageNumber || (e.section === "front" && !e.inToc),
        folio: n,
        book: book.title,
        author,
        title: titles[p.el].title,
        part: titles[p.el].part,
      });
      return { ...p, folio: chrome.folio, head: chrome.head, chrome };
    });
  })();

  // 3. show: spreads on wide screens (page 1 alone on the right), single pages on phones
  const [vw, setVw] = useState(() => (typeof window === "undefined" ? 1200 : window.innerWidth));
  const [vh, setVh] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));
  useEffect(() => {
    const on = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const single = vw < 760;
  const spreads = (() => {
    if (single) return pages.map((_, i) => [i] as (number | null)[]);
    const out: (number | null)[][] = [];
    if (pages.length) out.push([null, 0]);
    for (let i = 1; i < pages.length; i += 2) out.push([i, i + 1 < pages.length ? i + 1 : null]);
    return out;
  })();
  const spreadOf = (pageIdx: number) => (single ? pageIdx : Math.ceil(pageIdx / 2));

  // opens at the chapter being written, until the reader turns a page
  const [spread, setSpread] = useState<number | null>(null);
  const startAt = spreadOf(
    Math.max(
      0,
      pages.findIndex((p) => !p.blank && elements[p.el]?.chapter.id === startChapterId),
    ),
  );
  const current = Math.min(spread ?? startAt, Math.max(0, spreads.length - 1));

  // page turning: the leaf is drawn over the spread and flips, then the new spread takes its place
  const [turn, setTurn] = useState<null | { dir: 1 | -1; to: number }>(null);
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const go = (to: number) => {
    const target = Math.max(0, Math.min(spreads.length - 1, to));
    if (target === current || turn) return;
    if (single || reduceMotion || Math.abs(target - current) !== 1) {
      setSpread(target);
      return;
    }
    setTurn({ dir: target > current ? 1 : -1, to: target });
  };
  useEffect(() => {
    if (!turn) return;
    const t = setTimeout(() => {
      setSpread(turn.to);
      setTurn(null);
    }, TURN_MS);
    return () => clearTimeout(t);
  }, [turn]);

  const firstPage = spreads[current]?.find((p) => p != null) ?? 0;
  const chapterStarts = pages.map((p, i) => (!p.blank && p.k === 0 ? i : -1)).filter((i) => i >= 0);
  const goChapter = (dir: 1 | -1) => {
    const here = spreads[current]?.filter((p): p is number => p != null) ?? [0];
    const target = dir > 0 ? chapterStarts.find((s) => s > Math.max(...here)) : [...chapterStarts].reverse().find((s) => s < Math.min(...here));
    if (target != null) setSpread(spreadOf(target));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "SELECT") return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(current + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(current - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useLayoutEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const [jump, setJump] = useState<string | null>(null);
  const bookW = single ? W : W * 2;
  const scale = Math.max(0.2, Math.min((vw - (single ? 24 : 160)) / (bookW + 16), (vh - (single ? 170 : 190)) / (H + 12)));

  const renderPage = (idx: number | null, side: "left" | "right") => {
    if (idx == null || !pages[idx]) return <div style={{ width: W, height: H }} aria-hidden />;
    return <PageView page={pages[idx]} html={htmls[pages[idx].el]} side={single ? "right" : side} W={W} H={H} m={m} innerW={innerW} innerH={innerH} text={text} />;
  };
  const [L, R] = spreads[current] ?? [null, null];
  const next = turn ? spreads[turn.to] : null;

  const body = (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#eceff5] text-ink dark:bg-[#15171c]" role="dialog" aria-modal="true" aria-label="Full book preview">
      {THEME_FONTS_HREFS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style>{`${css}
.jp-fbp-flow img { max-height: ${Math.floor(innerH * 0.9)}px; object-fit: contain; }
.jp-fbp-flow figure, .jp-fbp-flow .chapter-head, .jp-fbp-flow img { break-inside: avoid; }
.jp-fbp-flow .chapter-head { margin-top: 4em; }
@keyframes jp-turn-fwd { from { transform: rotateY(0deg); } to { transform: rotateY(-180deg); } }
@keyframes jp-turn-back { from { transform: rotateY(0deg); } to { transform: rotateY(180deg); } }`}</style>

      <header className="flex shrink-0 items-center gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{book.title}</p>
          <p className="text-[13px] text-soft">
            {binding === "hardcover" ? "Hardcover" : "Paperback"} · {trim.label} · {theme.name}
          </p>
        </div>
        {base.hardcover && (
          <select aria-label="Edition" value={binding} onChange={(e) => setBinding(e.target.value as Binding)} className="h-9 rounded-md border border-input bg-card px-2 text-sm">
            <option value="paperback">Paperback</option>
            <option value="hardcover">Hardcover</option>
          </select>
        )}
        <button type="button" onClick={onClose} className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-primary hover:bg-primary-soft">
          Go back <X className="size-4" aria-hidden />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center gap-4 px-2">
        {/* hidden measuring box, the same width and height as a page's text area */}
        <div aria-hidden className="pointer-events-none fixed top-0 left-[-99999px] opacity-0">
          <div className="jp-preview text-[#1a1a1a]" style={{ fontSize: text }}>
            <div ref={measureRef} className="jp-fbp-flow" style={{ height: innerH, width: innerW, columnWidth: innerW, columnGap: GAP, columnFill: "auto" }} />
          </div>
        </div>

        {!counts ? (
          <div className="grid w-full max-w-sm gap-3 text-center" role="status">
            <p className="font-medium">Preparing your book…</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-paper-3">
              <div className="h-full bg-primary transition-[width]" style={{ width: `${elements.length ? (measured / elements.length) * 100 : 0}%` }} />
            </div>
            <p className="text-[13px] text-soft">
              Laying out {measured} of {elements.length} sections
            </p>
          </div>
        ) : (
          <>
            {!single && <ArrowButton label="Previous page" onClick={() => go(current - 1)} disabled={current === 0} dir={-1} />}
            <div style={{ width: (bookW + 16) * scale, height: (H + 12) * scale }} className="shrink-0">
              <div style={{ width: bookW + 16, height: H + 12, transform: `scale(${scale})`, transformOrigin: "0 0" }} className="relative">
                {/* page edges: a thin stack of paper under each side */}
                {!single && <div aria-hidden className="absolute inset-y-[3px] left-0 right-0 rounded-[2px] bg-[#d9d6cf] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.45)] dark:bg-[#8d8a83]" />}
                <div className="absolute flex" style={{ top: single ? 0 : 0, left: single ? 0 : 8, perspective: 2600 }}>
                  {single ? (
                    <div className="shadow-[0_12px_40px_-12px_rgba(0,0,0,0.4)]">{renderPage(L ?? null, "right")}</div>
                  ) : (
                    <>
                      {/* under the leaf: the side that stays, and the side being revealed */}
                      {renderPage(turn ? (turn.dir > 0 ? (L ?? null) : (next?.[0] ?? null)) : (L ?? null), "left")}
                      {renderPage(turn ? (turn.dir > 0 ? (next?.[1] ?? null) : (R ?? null)) : (R ?? null), "right")}
                      {turn && (
                        <div
                          className="absolute top-0"
                          style={{
                            left: turn.dir > 0 ? W : 0,
                            width: W,
                            height: H,
                            transformStyle: "preserve-3d",
                            transformOrigin: turn.dir > 0 ? "left center" : "right center",
                            animation: `${turn.dir > 0 ? "jp-turn-fwd" : "jp-turn-back"} ${TURN_MS}ms cubic-bezier(0.45, 0.05, 0.35, 1) forwards`,
                          }}
                        >
                          <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                            {renderPage(turn.dir > 0 ? (R ?? null) : (L ?? null), turn.dir > 0 ? "right" : "left")}
                          </div>
                          <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                            {renderPage(turn.dir > 0 ? (next?.[0] ?? null) : (next?.[1] ?? null), turn.dir > 0 ? "left" : "right")}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            {!single && <ArrowButton label="Next page" onClick={() => go(current + 1)} disabled={current >= spreads.length - 1} dir={1} />}
          </>
        )}
      </div>

      {counts && (
        <footer className="mx-auto grid w-full max-w-4xl shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex gap-2">
            {single && <ArrowButton label="Previous page" onClick={() => go(current - 1)} disabled={current === 0} dir={-1} small />}
            <FootButton onClick={() => goChapter(-1)} disabled={!chapterStarts.some((s) => s < firstPage)}>
              <ChevronFirst className="size-4" aria-hidden /> Chapter
            </FootButton>
          </div>
          <form
            className="flex items-center gap-2 text-sm whitespace-nowrap"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(jump);
              if (n >= 1) setSpread(spreadOf(Math.min(pages.length, n) - 1));
              setJump(null);
            }}
          >
            <span className="max-sm:hidden">
              Page {firstPage + 1} of {pages.length}
            </span>
            <input
              aria-label="Go to page"
              inputMode="numeric"
              value={jump ?? String(firstPage + 1)}
              onChange={(e) => setJump(e.target.value.replace(/\D/g, ""))}
              onBlur={() => setJump(null)}
              className="h-8 w-16 rounded-md border border-primary/50 bg-card text-center text-sm tabular-nums"
            />
            <span className="sm:hidden">/ {pages.length}</span>
          </form>
          <div className="flex justify-end gap-2">
            <FootButton onClick={() => goChapter(1)} disabled={!chapterStarts.some((s) => s > firstPage + (single ? 0 : 1))}>
              Chapter <ChevronLast className="size-4" aria-hidden />
            </FootButton>
            {single && <ArrowButton label="Next page" onClick={() => go(current + 1)} disabled={current >= spreads.length - 1} dir={1} small />}
          </div>
        </footer>
      )}
    </div>
  );
  return createPortal(body, document.body);
}

function PageView({
  page,
  html,
  side,
  W,
  H,
  m,
  innerW,
  innerH,
  text,
}: {
  page: Page;
  html: string;
  side: "left" | "right";
  W: number;
  H: number;
  m: { top: number; bottom: number; inside: number; outside: number };
  innerW: number;
  innerH: number;
  text: number;
}) {
  const left = side === "right" ? m.inside : m.outside;
  return (
    <div className="jp-preview relative overflow-hidden bg-white text-[#1a1a1a]" style={{ width: W, height: H, fontSize: text }}>
      {/* the curve of the paper into the spine */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 z-[1] w-10"
        style={
          side === "right"
            ? { left: 0, background: "linear-gradient(to right, rgba(0,0,0,0.13), rgba(0,0,0,0) 100%)" }
            : { right: 0, background: "linear-gradient(to left, rgba(0,0,0,0.13), rgba(0,0,0,0) 100%)" }
        }
      />
      {!page.blank && (
        <>
          {(page.head || page.chrome?.folioTop) && <PageHead chrome={page.chrome} head={page.head} style={{ left, width: innerW, top: m.top * 0.42 }} />}
          <div className="absolute overflow-hidden" style={{ top: m.top, left, width: innerW, height: innerH }}>
            <div
              className="jp-fbp-flow h-full"
              style={{ columnWidth: innerW, columnGap: GAP, columnFill: "auto", width: innerW, transform: `translateX(${-page.k * (innerW + GAP)}px)` }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
          {page.folio && !page.chrome?.folioTop && (
            <div className="absolute text-[0.8em] opacity-70" style={{ left, width: innerW, bottom: m.bottom * 0.4, textAlign: page.chrome?.folioAlign ?? "center" }}>
              {page.folio}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ArrowButton({ label, onClick, disabled, dir, small }: { label: string; onClick: () => void; disabled?: boolean; dir: 1 | -1; small?: boolean }) {
  const Icon = dir > 0 ? ChevronRight : ChevronLeft;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid shrink-0 place-items-center rounded-md border border-primary/60 bg-card text-primary transition hover:bg-primary-soft disabled:border-border disabled:text-soft disabled:hover:bg-card",
        small ? "size-9" : "size-11",
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}

function FootButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-primary/60 bg-card px-3 text-sm font-medium text-primary transition hover:bg-primary-soft disabled:border-border disabled:text-soft disabled:hover:bg-card sm:min-w-36"
    >
      {children}
    </button>
  );
}
