"use client";

import { useState } from "react";
import { elementHtml } from "@/lib/render-element";
import { orderedElements } from "@/lib/book-model";
import { themeCss } from "@/lib/theme-css";
import { getTheme, THEME_FONTS_HREF } from "@/lib/themes";
import { getTrim, pageGeometry } from "@/lib/kdp";
import { bookFormat, type Book, type Chapter } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEVICES = [
  { id: "kindle", label: "Kindle", width: 300, height: 400, frame: "bg-[#2a2a2a] p-4 pb-8 rounded-[14px]", screen: "bg-[#f4f3ef]", font: 15 },
  { id: "phone", label: "Phone", width: 270, height: 560, frame: "bg-[#111] p-2.5 rounded-[34px]", screen: "bg-white rounded-[24px]", font: 15 },
  { id: "tablet", label: "Tablet", width: 340, height: 460, frame: "bg-[#1b1b1b] p-3 rounded-[20px]", screen: "bg-white rounded-[6px]", font: 15 },
  { id: "print", label: "Print", width: 0, height: 0, frame: "", screen: "bg-white", font: 0 },
] as const;

/** Live preview of the selected element in the book's interior theme. */
export function Preview({ book, chapters, chapterId }: { book: Book; chapters: Chapter[]; chapterId: string | null }) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("kindle");
  const format = bookFormat(book);
  const theme = getTheme(format.theme);
  const elements = orderedElements(chapters, theme);
  const el = elements.find((e) => e.chapter.id === chapterId) ?? elements[0];
  const html = el ? elementHtml(el, { book, author: book.expand?.author ?? null, alsoBy: [] }, elements, theme) : "";
  const css = themeCss(theme, { scope: ".jp-preview", dropCaps: format.dropCaps, lineHeight: format.lineHeight });
  const d = DEVICES.find((x) => x.id === device)!;

  // print: draw the trim at 34px per inch with KDP margins
  const trim = getTrim(format.trim);
  const g = pageGeometry(format.trim, book.page_count || 200, false);
  const ppi = Math.min(34, 300 / trim.width);

  return (
    <div className="flex h-full flex-col">
      <link rel="stylesheet" href={THEME_FONTS_HREF} />
      <style>{css}</style>
      <div className="flex gap-1 border-b border-border px-3 py-2" role="tablist" aria-label="Preview device">
        {DEVICES.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={device === x.id}
            onClick={() => setDevice(x.id)}
            className={cn("rounded px-2.5 py-1 text-sm text-ink-2 hover:bg-paper-2", device === x.id && "bg-ink text-paper hover:bg-ink")}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-paper p-5">
        {device === "print" ? (
          <div
            className="jp-preview shrink-0 overflow-hidden bg-white text-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.15)]"
            style={{
              width: trim.width * ppi,
              height: trim.height * ppi,
              padding: `${g.margins.top * ppi}px ${g.margins.outside * ppi}px ${g.margins.bottom * ppi}px ${g.margins.inside * ppi}px`,
              fontSize: `${(format.fontSize / 72) * ppi}px`,
            }}
          >
            <div className="h-full overflow-hidden" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        ) : (
          <div className={cn("shrink-0", d.frame)}>
            <div className={cn("jp-preview overflow-y-auto px-5 py-6 text-[#1a1a1a]", d.screen)} style={{ width: d.width, height: d.height, fontSize: d.font }} dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        )}
      </div>
      <p className="border-t border-border px-4 py-2 text-[13px] text-soft">
        {device === "print" ? `First page at ${trim.label}, ${theme.name} theme. Build a PDF proof on the Export tab for exact pages.` : `${theme.name} theme. E-readers let readers change the font and size.`}
      </p>
    </div>
  );
}
