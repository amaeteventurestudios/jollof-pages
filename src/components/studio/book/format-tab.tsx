"use client";

import { BLEED, coverGeometry, estimatePages, HARDCOVER, HARDCOVER_TRIMS, hardcoverTrim, inches, maxPages, minOutside, minPages, PAPER_LABELS, pageGeometry, TRIM_SIZES, type Binding, type PaperType } from "@/lib/kdp";
import { useState } from "react";
import { getTheme, themeFor, THEME_FONTS_HREFS, type InteriorTheme, type ThemeCustom } from "@/lib/themes";
import { FONTS, type FontRole } from "@/lib/fonts";
import { ImagePickerDialog, assetUrl } from "@/components/studio/image-library";
import { BackgroundPicker, DropCapPicker, OrnamentPicker, ThemeGallery, ThemeSwatch } from "./design-pickers";
import { BACKGROUNDS } from "@/lib/backgrounds";
import type { CustomMargins, PageBackground } from "@/lib/types";
import { bookFormat, printEdition, type BookFormat } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/progress";
import type { Workspace } from "./workspace";
import { EditStyles } from "./edit-styles";
import { HeadersFooters } from "./headers-footers";

export function usePageCount(ws: Workspace, binding: Binding = "paperback"): { pages: number; estimated: boolean } {
  const f = bookFormat(ws.book);
  const built = binding === "hardcover" ? ws.book.hardcover_page_count : ws.book.page_count;
  if (built) return { pages: built, estimated: false };
  const { trim } = printEdition(f, binding);
  return { pages: estimatePages(ws.book.word_count || 0, trim, ws.chapters.length, f.largePrint ? 16 : f.fontSize), estimated: true };
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
  const g = pageGeometry(f.trim, pages, f.bleed, "paperback", f.margins);
  const cover = coverGeometry(f.trim, pages, f.paper);
  const max = maxPages(g.trim, f.paper);
  const theme = themeFor(f);
  const custom = f.custom;
  const setCustom = (patch: ThemeCustom) => set({ custom: { ...(f.custom ?? {}), ...patch } });
  const bg = f.pageBackground?.src ? f.pageBackground : null;
  const setBackground = (patch: Partial<PageBackground> | null) =>
    set({ pageBackground: patch === null ? undefined : { src: "", strength: 0.7, where: "openers", ...(f.pageBackground ?? {}), ...patch } });
  const [pickingBg, setPickingBg] = useState(false);
  const hard = usePageCount(ws, "hardcover");
  const hc = printEdition(f, "hardcover");
  const hg = pageGeometry(hc.trim, hard.pages, f.bleed, "hardcover", f.margins);
  const hcover = coverGeometry(hc.trim, hard.pages, hc.paper, "hardcover");
  const sameTrim = hc.trim === f.trim;
  const units = f.units ?? "in";
  const minOut = minOutside(f.bleed);
  const bleedAdd = f.bleed ? BLEED : 0;
  const ga = pageGeometry(f.trim, pages, f.bleed);
  const setMargin = (patch: Partial<CustomMargins>) => {
    const next: CustomMargins = { ...(f.margins ?? {}), ...patch };
    for (const k of Object.keys(next) as (keyof CustomMargins)[]) if (next[k] === undefined) delete next[k];
    set({ margins: Object.keys(next).length ? next : undefined });
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_22rem]">
      {THEME_FONTS_HREFS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <div className="grid gap-10">
        <section>
          <h2 className="text-lg font-medium">Interior theme</h2>
          <p className="mt-1 text-sm text-soft">93 themes. One theme styles the print PDF, the ebook and the preview. Pick one, then make it yours below.</p>
          <div className="mt-4">
            <ThemeGallery value={f.theme} onChange={(id) => set({ theme: id, custom: { ...(f.custom?.boxes ? { boxes: f.custom.boxes } : {}), ...(f.custom?.boxPresets ? { boxPresets: f.custom.boxPresets } : {}) } })} />
          </div>
        </section>

        <section className="rounded-xl bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">Make it yours</h2>
              <p className="mt-1 text-sm text-soft">Change any part of {getTheme(f.theme).name}. Picking another theme starts fresh.</p>
            </div>
            {custom && Object.keys(custom).length > 0 && (
              <button type="button" onClick={() => set({ custom: {} })} className="h-8 rounded-full border border-border px-3 text-[13px] hover:border-primary">
                Reset to the theme
              </button>
            )}
          </div>
          <div className="mt-5 grid gap-6 xl:grid-cols-[16rem_1fr]">
            <div className="mx-auto w-56 xl:mx-0">
              <ThemeSwatch t={theme} sample="Know your reader" />
            </div>
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Accent colour</span>
                  <span className="flex items-center gap-2">
                    <input type="color" value={theme.accent} onChange={(e) => setCustom({ accent: e.target.value })} className="h-9 w-14 rounded border border-input bg-card" />
                    <span className="tabular text-[13px] text-soft">{theme.accent}</span>
                  </span>
                </label>
                <FontSelect label="Heading font" value={theme.headingFont} onChange={(v) => setCustom({ headingFont: v })} />
                <FontSelect label="Body font" value={theme.bodyFont} onChange={(v) => setCustom({ bodyFont: v })} roles={["serif", "sans"]} />
                <FontSelect label="Chapter label font" value={theme.labelFont ?? ""} onChange={(v) => setCustom({ labelFont: v })} allowSame />
                <Choice
                  label="Chapter label"
                  value={theme.chapterLabel}
                  onChange={(v) => setCustom({ chapterLabel: v as InteriorTheme["chapterLabel"] })}
                  options={[
                    ["word", "Chapter One"],
                    ["number", "Number"],
                    ["none", "No label"],
                  ]}
                />
                <Choice
                  label="Label style"
                  value={theme.labelStyle}
                  onChange={(v) => setCustom({ labelStyle: v as InteriorTheme["labelStyle"] })}
                  options={[
                    ["smallcaps", "Small capitals"],
                    ["upper", "Spaced capitals"],
                    ["large", "Large"],
                  ]}
                />
                <Choice
                  label="Title position"
                  value={theme.headingAlign}
                  onChange={(v) => setCustom({ headingAlign: v as InteriorTheme["headingAlign"] })}
                  options={[
                    ["center", "Centred"],
                    ["left", "Left"],
                  ]}
                />
                <Choice
                  label="Title lettering"
                  value={`${theme.headingCase}-${theme.headingItalic ? "i" : "r"}`}
                  onChange={(v) => setCustom({ headingCase: v.startsWith("upper") ? "upper" : "normal", headingItalic: v.endsWith("-i") })}
                  options={[
                    ["normal-r", "Regular"],
                    ["normal-i", "Italic"],
                    ["upper-r", "Capitals"],
                    ["upper-i", "Italic capitals"],
                  ]}
                />
                <Choice
                  label="Lines by the title"
                  value={theme.headingRule}
                  onChange={(v) => setCustom({ headingRule: v as InteriorTheme["headingRule"] })}
                  options={[
                    ["none", "None"],
                    ["short", "Short flourish"],
                    ["above", "Above"],
                    ["below", "Below"],
                    ["both", "Above and below"],
                  ]}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium">Drop cap</h3>
                <div className="mt-2">
                  <DropCapPicker theme={theme} value={theme.dropCap} onChange={(v) => setCustom({ dropCap: v })} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium">Scene-break ornament</h3>
                <p className="text-[13px] text-soft">60 ornaments. Any single scene break can use a different one: click it in the editor.</p>
                <div className="mt-2">
                  <OrnamentPicker value={theme.ornament} accent={theme.accent} onChange={(id) => setCustom({ ornament: id })} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="edit-styles" className="rounded-xl bg-card p-5">
          <h2 className="text-lg font-medium">Edit styles</h2>
          <p className="mt-1 text-sm text-soft">How the text sits on the page, the same in print, the ebook and on your website. Also in the editor: Styles, above the page.</p>
          <div className="mt-4">
            <EditStyles ws={ws} />
          </div>
        </section>

        <section>
          <h2 className="text-lg font-medium">Page background</h2>
          <p className="mt-1 text-sm text-soft">
            {BACKGROUNDS.length} backgrounds, or your own picture. The painted ones run across both facing pages. Each chapter can have its own too, from the chapter settings in Write. On black and white paper, backgrounds print in grey.
          </p>
          <div className="mt-4">
            <BackgroundPicker value={bg?.src ?? ""} onChange={(v) => setBackground(v ? { src: v } : null)} onUpload={() => setPickingBg(true)} />
          </div>
          {bg?.src && (
            <div className="mt-4 flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-3 text-sm">
                <span className="font-medium">Strength</span>
                <input type="range" min={10} max={100} step={5} value={Math.round(bg.strength * 100)} onChange={(e) => setBackground({ strength: Number(e.target.value) / 100 })} className="w-40 accent-[var(--primary)]" />
                <span className="tabular w-10 text-soft">{Math.round(bg.strength * 100)}%</span>
              </label>
              <Choice
                label="Where"
                inline
                value={bg.where}
                onChange={(v) => setBackground({ where: v as "all" | "openers" })}
                options={[
                  ["openers", "First page of each chapter"],
                  ["all", "Every page"],
                ]}
              />
            </div>
          )}
          <ImagePickerDialog
            open={pickingBg}
            onOpenChange={setPickingBg}
            bookId={ws.book.id}
            title="Background picture"
            description="Fills the page behind the text, faded so the words stay easy to read. Use a large picture."
            onPick={(a) => setBackground({ src: assetUrl(a) })}
          />
        </section>

        <section>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium">Trim size</h2>
              <p className="mt-1 text-sm text-soft">The finished size of the paperback. Every size Amazon KDP prints is here; 6&quot; x 9&quot; is the most common for non-fiction.</p>
            </div>
            <div className="flex rounded-full border border-border p-0.5 text-[13px]" role="radiogroup" aria-label="Units">
              {(["in", "mm"] as const).map((u) => (
                <button key={u} type="button" role="radio" aria-checked={units === u} onClick={() => set({ units: u })} className={cn("h-7 rounded-full px-3", units === u ? "bg-primary text-primary-foreground" : "hover:text-primary")}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3" role="radiogroup" aria-label="Trim size">
            {TRIM_SIZES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={t.id === f.trim} onClick={() => set({ trim: t.id })} className="group flex w-[4.75rem] flex-col items-center gap-2">
                <span
                  className={cn("block bg-card ring-2 ring-transparent transition group-hover:ring-paper-3", t.id === f.trim && "bg-primary-soft ring-primary group-hover:ring-primary")}
                  style={{ width: t.width * 7, height: t.height * 7 }}
                  aria-hidden
                />
                <span className={cn("text-center text-[12.5px] leading-tight text-ink-2", t.id === f.trim && "font-medium text-primary")}>{trimLabel(t.width, t.height, units)}</span>
              </button>
            ))}
          </div>
          <div className="mt-8">
            <h3 className="font-medium">Page margins</h3>
            <p className="mt-1 text-sm text-soft">
              Automatic margins grow with the page count and always pass KDP. Pick your own and they still never go below KDP&apos;s minimum for this book ({len(g.minimums.inside, units)} inside at {pages} pages, {len(minOut, units)} elsewhere).
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MarginSelect label="Inside (gutter)" hint="Toward the binding, for text." min={g.minimums.inside} value={f.margins?.inside} auto={ga.margins.inside} units={units} onChange={(v) => setMargin({ inside: v })} />
              <MarginSelect label="Outside" hint="Toward the page edge." min={minOut} value={f.margins?.outside} auto={ga.margins.outside - bleedAdd} units={units} onChange={(v) => setMargin({ outside: v })} />
              <MarginSelect label="Top" min={minOut} value={f.margins?.top} auto={ga.margins.top - bleedAdd} units={units} onChange={(v) => setMargin({ top: v })} />
              <MarginSelect label="Bottom" min={minOut} value={f.margins?.bottom} auto={ga.margins.bottom - bleedAdd} units={units} onChange={(v) => setMargin({ bottom: v })} />
              <MarginSelect
                label="Picture gutter"
                hint="How far full-page pictures stay from the binding."
                min={0}
                value={f.margins?.pictureGutter}
                auto={0}
                autoLabel="None: into the gutter"
                units={units}
                onChange={(v) => setMargin({ pictureGutter: v })}
              />
            </div>
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

        <section>
          <h2 className="text-lg font-medium">Hardcover edition</h2>
          <p className="mt-1 text-sm text-soft">
            KDP&apos;s case laminate hardcover: the cover is printed on the boards, with no dust jacket. It is a separate edition on KDP with its own ISBN, interior PDF and cover, all made from this
            same manuscript.
          </p>
          <div className="mt-4 grid gap-4">
            <Toggle
              checked={f.hardcover}
              onChange={(v) => set({ hardcover: v, hardcoverTrim: f.hardcoverTrim || hardcoverTrim(f.trim).id })}
              label="Also publish a hardcover"
              hint={`${HARDCOVER.minPages} to ${HARDCOVER.maxPages} pages. The interior gets a ${inches(HARDCOVER.extraGutter)} wider gutter, because a hardcover does not open as flat.`}
            />
            {f.hardcover && (
              <>
                <div className="flex flex-wrap items-end gap-3" role="radiogroup" aria-label="Hardcover trim size">
                  {HARDCOVER_TRIMS.map((t) => (
                    <button key={t.id} type="button" role="radio" aria-checked={t.id === hc.trim} onClick={() => set({ hardcoverTrim: t.id })} className="group flex flex-col items-center gap-2">
                      <span
                        className={cn("block bg-card ring-2 ring-transparent transition group-hover:ring-paper-3", t.id === hc.trim && "bg-primary-soft ring-primary group-hover:ring-primary")}
                        style={{ width: t.width * 9, height: t.height * 9 }}
                        aria-hidden
                      />
                      <span className={cn("text-[13px] text-ink-2", t.id === hc.trim && "font-medium text-primary")}>{t.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[13px] text-soft">
                  {sameTrim
                    ? "Same size as the paperback, so both editions sit together on a shelf."
                    : `KDP does not bind ${getTrimLabel(f.trim)} in hardcover, so the hardcover is ${getTrimLabel(hc.trim)}.`}
                  {hc.paper !== f.paper && " Hardcovers print colour only as premium colour, so this edition uses premium colour paper."}
                </p>
              </>
            )}
          </div>
        </section>

        <HeadersFooters format={f} bookTitle={ws.book.title} author={ws.book.expand?.author?.name ?? ""} onChange={set} />

        <section className="grid gap-3 sm:grid-cols-2">
          <Toggle
            checked={f.chaptersOnRight}
            onChange={(v) => set({ chaptersOnRight: v })}
            label="Start chapters on a right-hand page"
            hint="Adds a blank page where needed, as most printed books do."
          />
          {!f.chaptersOnRight && (
            <Toggle
              checked={f.firstChapterOnRight !== false}
              onChange={(v) => set({ firstChapterOnRight: v })}
              label="Start the first chapter on a right-hand page"
              hint="Only chapter one; the rest follow straight on. Adds a blank page if needed."
            />
          )}
          <Toggle
            checked={!f.countFrontMatter}
            onChange={(v) => set({ countFrontMatter: !v })}
            label="Begin counting pages at chapter one"
            hint="Page 1 is the first chapter and the front matter gets i, ii, iii. Turn off to count the front matter in the same numbers."
          />
          <Toggle
            checked={f.dropCaps}
            onChange={(v) => set({ dropCaps: v })}
            label="Decorative chapter openings"
            hint={`Drop cap in the ebook${theme.leadIn ? " and small-caps lead-in in print" : ""}.`}
          />
          <Toggle checked={f.printToc} onChange={(v) => set({ printToc: v })} label="Table of contents in print" hint="With page numbers. The ebook always has a linked contents." />
          <Toggle
            checked={f.tocSubheads}
            onChange={(v) => set({ tocSubheads: v })}
            label="Show sub-chapters in the contents"
            hint="Lists each chapter's headings under it, in the printed contents and the ebook's contents menu. Make a sub-chapter with Heading in the editor's text style menu."
          />
          <Toggle checked={f.bleed} onChange={(v) => set({ bleed: v })} label="Bleed" hint="Only if images run to the edge of the page. Adds 0.125 in on three sides." />
          <Toggle checked={f.largePrint} onChange={(v) => set({ largePrint: v })} label="Large print edition" hint="16 pt text with wider spacing, for readers with low vision." />
        </section>
      </div>

      <aside className="h-fit rounded-md bg-card p-5 lg:sticky lg:top-6">
        <h2 className="font-medium">Print specification</h2>
        <p className="mt-1 text-[13px] text-soft">
          {estimated ? `Pages estimated from ${fmt(ws.book.word_count || 0)} words. Build a PDF on the Export tab for the exact count.` : "Page count from your last PDF."}
        </p>
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
        {(pages < minPages() || pages > max) && (
          <Warning>
            KDP prints paperbacks of {minPages()} to {max} pages for this trim and paper. This book is at {pages}.
          </Warning>
        )}
        {f.hardcover && (
          <>
            <h2 className="mt-6 border-t border-border pt-5 font-medium">Hardcover</h2>
            <p className="mt-1 text-[13px] text-soft">
              {hard.estimated ? "Pages estimated. Build the hardcover PDF on the Export tab for the exact count." : "Page count from your last hardcover PDF."}
            </p>
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-soft">Pages</dt>
              <dd className="tabular">{fmt(hard.pages)}</dd>
              <dt className="text-soft">Page size</dt>
              <dd className="tabular">
                {inches(hg.pageWidth)} x {inches(hg.pageHeight)}
              </dd>
              <dt className="text-soft">Inside margin (gutter)</dt>
              <dd className="tabular">
                {inches(hg.margins.inside)} <span className="text-soft">min {inches(hg.minimums.inside)}</span>
              </dd>
              <dt className="text-soft">Spine with boards</dt>
              <dd className="tabular">{inches(hcover.spine, 4)}</dd>
              <dt className="text-soft">Cover with wrap</dt>
              <dd className="tabular">
                {inches(hcover.width)} x {inches(hcover.height)}
              </dd>
            </dl>
            {(hard.pages < HARDCOVER.minPages || hard.pages > HARDCOVER.maxPages) && (
              <Warning>
                KDP prints hardcovers of {HARDCOVER.minPages} to {HARDCOVER.maxPages} pages. This edition is at {hard.pages}.
              </Warning>
            )}
          </>
        )}
      </aside>
    </div>
  );
}

function getTrimLabel(id: string): string {
  return TRIM_SIZES.find((t) => t.id === id)?.label ?? id;
}

function Warning({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 rounded bg-[#fbeedd] p-3 text-[13px] text-[#7a4210] dark:bg-[#3a2a12] dark:text-[#f0c27a]">{children}</p>;
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

function FontSelect({ label, value, onChange, roles, allowSame }: { label: string; value: string; onChange: (v: string) => void; roles?: FontRole[]; allowSame?: boolean }) {
  const groups: [string, FontRole[]][] = [
    ["Book faces", ["serif"]],
    ["Clean faces", ["sans"]],
    ["Display", ["display"]],
    ["Script and handwriting", ["script", "hand"]],
    ["Typewriter", ["mono"]],
  ];
  return (
    <label className="grid min-w-0 gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full min-w-0 rounded-md border border-input bg-card px-2" style={{ fontFamily: value ? `'${value}'` : undefined }}>
        {allowSame && <option value="">Same as headings</option>}
        {groups.map(([name, rs]) => {
          const list = FONTS.filter((f) => rs.some((r) => r === f.role) && (!roles || roles.includes(f.role)));
          return list.length ? (
            <optgroup key={name} label={name}>
              {list.map((f) => (
                <option key={f.family} value={f.family}>
                  {f.family}
                </option>
              ))}
            </optgroup>
          ) : null;
        })}
      </select>
    </label>
  );
}

function Choice({ label, value, onChange, options, inline }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][]; inline?: boolean }) {
  return (
    <label className={cn("text-sm", inline ? "flex items-center gap-3" : "grid min-w-0 gap-1.5")}>
      <span className="font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn("h-9 rounded-md border border-input bg-card px-2", !inline && "w-full min-w-0")}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

const MM = 25.4;

function len(inches: number, units: "in" | "mm"): string {
  return units === "mm" ? `${(inches * MM).toFixed(1).replace(/\.0$/, "")} mm` : `${+inches.toFixed(3)}"`;
}

function trimLabel(w: number, h: number, units: "in" | "mm"): string {
  return units === "mm" ? `${Math.round(w * MM)} x ${Math.round(h * MM)} mm` : `${w}" x ${h}"`;
}

/** One margin: automatic, or a size from KDP's minimum up to 1.5 inches in eighths. */
function MarginSelect({ label, hint, min, value, auto, autoLabel, units, onChange }: { label: string; hint?: string; min: number; value: number | undefined; auto: number; autoLabel?: string; units: "in" | "mm"; onChange: (v: number | undefined) => void }) {
  const steps: number[] = [];
  for (let v = Math.ceil(min * 8) / 8; v <= 1.5 + 1e-9; v += 0.125) steps.push(+v.toFixed(3));
  if (min > 0 && !steps.includes(+min.toFixed(3))) steps.unshift(+min.toFixed(3));
  const shown = value === undefined ? "" : String(Math.max(value, min));
  return (
    <label className="grid min-w-0 content-start gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select value={shown} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} className="h-9 w-full min-w-0 rounded-md border border-input bg-card px-2">
        <option value="">{autoLabel ?? `Automatic (${len(auto, units)})`}</option>
        {steps.map((v) => (
          <option key={v} value={String(v)}>
            {len(v, units)}
            {Math.abs(v - min) < 1e-6 && min > 0 ? " (KDP minimum)" : ""}
          </option>
        ))}
      </select>
      {hint && <span className="text-[12.5px] text-soft">{hint}</span>}
    </label>
  );
}
