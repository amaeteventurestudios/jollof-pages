"use client";

import { useState } from "react";
import { BLEED, PAPER_LABELS, SPINE_PER_PAGE, getTrim, type PaperType } from "@/lib/kdp";
import { useStage } from "./stage";

/** Type a page count; the book on the stage grows or thins to the real KDP spine width. */
export function SpineCalculator({ trim = "6x9" }: { trim?: string }) {
  const { setPages } = useStage();
  const [pages, setLocal] = useState(240);
  const [paper, setPaper] = useState<PaperType>("cream");
  const t = getTrim(trim);
  const spine = pages * SPINE_PER_PAGE[paper];
  const width = BLEED * 2 + t.width * 2 + spine;
  return (
    <div className="mt-8 bg-ink p-5 text-paper">
      <label htmlFor="spine-pages" className="t-small block text-paper">
        Pages in your book
      </label>
      <div className="mt-2 flex items-center gap-4">
        <input
          id="spine-pages"
          type="range"
          min={24}
          max={828}
          value={pages}
          onChange={(e) => {
            const n = Number(e.target.value);
            setLocal(n);
            setPages(n);
          }}
          className="h-11 flex-1 accent-[#5bc48a]"
        />
        <output htmlFor="spine-pages" className="tabular w-14 text-right text-[1.5rem]">
          {pages}
        </output>
      </div>
      <label htmlFor="spine-paper" className="t-small mt-3 block text-paper">
        Paper
      </label>
      <select
        id="spine-paper"
        value={paper}
        onChange={(e) => setPaper(e.target.value as PaperType)}
        className="mt-1 h-11 w-full bg-paper px-3 text-ink"
      >
        {(Object.keys(PAPER_LABELS) as PaperType[]).map((p) => (
          <option key={p} value={p}>
            {PAPER_LABELS[p]}
          </option>
        ))}
      </select>
      <p className="tabular mt-4 text-[1.25rem] leading-snug" aria-live="polite">
        Spine {spine.toFixed(3)} in. Full cover {width.toFixed(3)} × {(t.height + BLEED * 2).toFixed(3)} in.
      </p>
      <p className="t-small mt-1 text-paper">{pages < 79 ? "Too thin for spine text on KDP." : "Room for the title on the spine."}</p>
    </div>
  );
}
