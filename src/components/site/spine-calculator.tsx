"use client";

import { useState } from "react";
import { BLEED, PAPER_LABELS, SPINE_PER_PAGE, getTrim, type PaperType } from "@/lib/kdp";
import type { StageBook } from "@/lib/site-data";
import { BookObject } from "./book-object";
import { Pattern } from "./patterns";

/** Slide the page count; the book beside it thickens to the real KDP spine width. */
export function SpineCalculator({ book }: { book: StageBook | null }) {
  const [pages, setPages] = useState(240);
  const [paper, setPaper] = useState<PaperType>("cream");
  const t = getTrim(book?.trim ?? "6x9");
  const spine = pages * SPINE_PER_PAGE[paper];
  const width = BLEED * 2 + t.width * 2 + spine;
  return (
    <div className="grid overflow-hidden bg-char text-cream lg:grid-cols-[1.1fr_1fr]">
      <div className="p-6 sm:p-10">
        <label htmlFor="spine-pages" className="block font-medium">
          Pages in your book
        </label>
        <div className="mt-3 flex items-center gap-5">
          <input
            id="spine-pages"
            type="range"
            min={24}
            max={828}
            value={pages}
            onChange={(e) => setPages(Number(e.target.value))}
            className="h-11 flex-1 accent-[var(--bonnet)]"
          />
          <output htmlFor="spine-pages" className="tabular wide w-20 text-right text-[2.25rem] leading-none font-bold">
            {pages}
          </output>
        </div>
        <label htmlFor="spine-paper" className="mt-6 block font-medium">
          Paper
        </label>
        <select id="spine-paper" value={paper} onChange={(e) => setPaper(e.target.value as PaperType)} className="mt-2 h-12 w-full bg-cream px-5 text-char">
          {(Object.keys(PAPER_LABELS) as PaperType[]).map((p) => (
            <option key={p} value={p}>
              {PAPER_LABELS[p]}
            </option>
          ))}
        </select>
        <dl className="mt-8 grid grid-cols-2 gap-4" aria-live="polite">
          <div className=" bg-char-2 p-4">
            <dt className="t-small text-cream/75">Spine</dt>
            <dd className="tabular wide mt-1 text-[1.75rem] font-bold">{spine.toFixed(3)} in</dd>
          </div>
          <div className=" bg-char-2 p-4">
            <dt className="t-small text-cream/75">Full cover</dt>
            <dd className="tabular mt-1 text-[1.25rem] font-semibold">
              {width.toFixed(3)} × {(t.height + BLEED * 2).toFixed(3)} in
            </dd>
          </div>
        </dl>
        <p className="t-small mt-4 text-cream/75">{pages < 79 ? "Too thin for spine text on KDP." : "Room for the title on the spine."}</p>
      </div>
      <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden bg-cream p-10">
        <Pattern id="p-calc" kind="rice" color="var(--cream-2)" />
        {book && <BookObject book={book} scale={30} pages={pages} className="book-turn relative" />}
      </div>
    </div>
  );
}
