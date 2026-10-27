"use client";

import { coverGeometry, estimatePages, inches, maxPages, MIN_PAGES, PAPER_LABELS, pageGeometry, TRIM_SIZES, type PaperType } from "@/lib/kdp";
import { getTheme, THEMES, THEME_FONTS_HREF } from "@/lib/themes";
import { bookFormat, type BookFormat } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/progress";
import type { Workspace } from "./workspace";

export function usePageCount(ws: Workspace): { pages: number; estimated: boolean } {
  const f = bookFormat(ws.book);
  if (ws.book.page_count) return { pages: ws.book.page_count, estimated: false };
  return { pages: estimatePages(ws.book.word_count || 0, f.trim, ws.chapters.length, f.largePrint ? 16 : f.fontSize), estimated: true };
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md bg-card p-3">
      <input type="checkbox" className="mt-1 size-4 accent-[var(--primary)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-[13px] text-soft">{hint}</span>
      </span>
    </label>
  );
}

export function FormatTab({ ws }: { ws: Workspace }) {
  const f = bookFormat(ws.book);
  const set = (patch: Partial<BookFormat>) => ws.saveBook({ format: { ...f, ...patch } });
  const { pages, estimated } = usePageCount(ws);
  const g = pageGeometry(f.trim, pages, f.bleed);
  const cover = coverGeometry(f.trim, pages, f.paper);
  const max = maxPages(g.trim, f.paper);
  const theme = getTheme(f.theme);

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_22rem]">
      <link rel="stylesheet" href={THEME_FONTS_HREF} />
      <div className="grid gap-10">
        <section>
          <h2 className="text-lg font-medium">Interior theme</h2>
          <p className="mt-1 text-sm text-soft">One theme styles the print PDF, the ebook and the preview.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Interior theme">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={t.id === f.theme}
                onClick={() => set({ theme: t.id })}
                className={cn("rounded-md bg-card p-4 text-left ring-2 ring-transparent transition hover:ring-paper-3", t.id === f.theme && "ring-primary hover:ring-primary")}
              >
                <span className="block text-[13px] text-soft">{t.name}</span>
                <span className="mt-3 block" style={{ fontFamily: t.headingCss, textAlign: t.headingAlign }}>
                  <span className="block text-[12px] tracking-[0.12em] uppercase" style={{ color: t.accent }}>
                    {t.chapterLabel === "word" ? "Chapter One" : "1"}
                  </span>
                  <span className="block text-xl leading-tight" style={{ fontStyle: t.headingItalic ? "italic" : "normal", fontWeight: t.headingWeight }}>
                    Know your reader
                  </span>
                </span>
                <span className="mt-3 block text-[14px] leading-snug text-ink-2" style={{ fontFamily: t.bodyCss }}>
                  Every book begins as a promise to a particular reader.
                </span>
                <span className="mt-3 block text-[13px] text-soft">{t.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium">Trim size</h2>
          <p className="mt-1 text-sm text-soft">The finished size of the paperback. 6&quot; x 9&quot; is the most common for non-fiction.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3" role="radiogroup" aria-label="Trim size">
            {TRIM_SIZES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={t.id === f.trim} onClick={() => set({ trim: t.id })} className="group flex flex-col items-center gap-2">
                <span
                  className={cn("block bg-card ring-2 ring-transparent transition group-hover:ring-paper-3", t.id === f.trim && "bg-primary-soft ring-primary group-hover:ring-primary")}
                  style={{ width: t.width * 9, height: t.height * 9 }}
                  aria-hidden
                />
                <span className={cn("text-[13px] text-ink-2", t.id === f.trim && "font-medium text-primary")}>{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Paper and ink</span>
            <select value={f.paper} onChange={(e) => set({ paper: e.target.value as PaperType })} className="h-9 rounded-md border border-input bg-card px-2">
              {(Object.keys(PAPER_LABELS) as PaperType[]).map((p) => (
                <option key={p} value={p}>
                  {PAPER_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Body size</span>
            <select value={f.fontSize} onChange={(e) => set({ fontSize: Number(e.target.value) })} className="h-9 rounded-md border border-input bg-card px-2" disabled={f.largePrint}>
              {[10, 10.5, 11, 11.5, 12, 13].map((n) => (
                <option key={n} value={n}>
                  {n} pt
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Line spacing</span>
            <select value={f.lineHeight} onChange={(e) => set({ lineHeight: Number(e.target.value) })} className="h-9 rounded-md border border-input bg-card px-2">
              {[1.3, 1.35, 1.4, 1.45, 1.5, 1.6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Toggle checked={f.chaptersOnRight} onChange={(v) => set({ chaptersOnRight: v })} label="Start chapters on a right-hand page" hint="Adds a blank page where needed, as most printed books do." />
          <Toggle checked={f.dropCaps} onChange={(v) => set({ dropCaps: v })} label="Decorative chapter openings" hint={`Drop cap in the ebook${theme.leadIn ? " and small-caps lead-in in print" : ""}.`} />
          <Toggle checked={f.runningHeads} onChange={(v) => set({ runningHeads: v })} label="Running heads" hint="Book title on left pages, chapter title on right pages." />
          <Toggle checked={f.printToc} onChange={(v) => set({ printToc: v })} label="Table of contents in print" hint="With page numbers. The ebook always has a linked contents." />
          <Toggle checked={f.bleed} onChange={(v) => set({ bleed: v })} label="Bleed" hint="Only if images run to the edge of the page. Adds 0.125 in on three sides." />
          <Toggle checked={f.largePrint} onChange={(v) => set({ largePrint: v })} label="Large print edition" hint="16 pt text with wider spacing, for readers with low vision." />
        </section>
      </div>

      <aside className="h-fit rounded-md bg-card p-5 lg:sticky lg:top-6">
        <h2 className="font-medium">Print specification</h2>
        <p className="mt-1 text-[13px] text-soft">{estimated ? `Pages estimated from ${fmt(ws.book.word_count || 0)} words. Build a PDF on the Export tab for the exact count.` : "Page count from your last PDF."}</p>
        <PageDiagram width={g.pageWidth} height={g.pageHeight} m={g.margins} />
        <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-soft">Pages</dt>
          <dd className="tabular">{fmt(pages)}</dd>
          <dt className="text-soft">Page size</dt>
          <dd className="tabular">
            {inches(g.pageWidth)} x {inches(g.pageHeight)}
          </dd>
          <dt className="text-soft">Inside margin (gutter)</dt>
          <dd className="tabular">
            {inches(g.margins.inside)} <span className="text-soft">min {inches(g.minimums.inside)}</span>
          </dd>
          <dt className="text-soft">Outside margin</dt>
          <dd className="tabular">
            {inches(g.margins.outside)} <span className="text-soft">min {inches(g.minimums.outside)}</span>
          </dd>
          <dt className="text-soft">Top and bottom</dt>
          <dd className="tabular">
            {inches(g.margins.top)} / {inches(g.margins.bottom)}
          </dd>
          <dt className="text-soft">Spine width</dt>
          <dd className="tabular">{inches(cover.spine, 4)}</dd>
          <dt className="text-soft">Full cover with bleed</dt>
          <dd className="tabular">
            {inches(cover.width)} x {inches(cover.height)}
          </dd>
          <dt className="text-soft">Spine text</dt>
          <dd>{cover.spineTextAllowed ? "Allowed" : "Not until 79 pages"}</dd>
        </dl>
        {(pages < MIN_PAGES || pages > max) && (
          <p className="mt-4 rounded bg-[#fbeedd] p-3 text-[13px] text-[#7a4210] dark:bg-[#3a2a12] dark:text-[#f0c27a]">
            KDP prints {MIN_PAGES} to {max} pages for this trim and paper. This book is at {pages}.
          </p>
        )}
      </aside>
    </div>
  );
}

function PageDiagram({ width, height, m }: { width: number; height: number; m: { inside: number; outside: number; top: number; bottom: number } }) {
  const s = 16;
  const W = width * s;
  const H = height * s;
  return (
    <svg viewBox={`0 0 ${W * 2 + 6} ${H}`} className="mt-4 w-full" role="img" aria-label="Facing pages with margins">
      {[0, 1].map((i) => {
        const x = i * (W + 6);
        const left = i === 0 ? m.outside : m.inside;
        const right = i === 0 ? m.inside : m.outside;
        return (
          <g key={i}>
            <rect x={x} y={0} width={W} height={H} fill="var(--paper)" />
            <rect x={x + left * s} y={m.top * s} width={W - (left + right) * s} height={H - (m.top + m.bottom) * s} fill="var(--paper-3)" />
          </g>
        );
      })}
      <rect x={W} y={0} width={6} height={H} fill="var(--ink)" opacity={0.15} />
    </svg>
  );
}
