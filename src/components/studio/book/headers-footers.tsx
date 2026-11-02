"use client";

import { FOLIO_PLACES, HEAD_CONTENT, pageChrome, runningHeads, type RunningHeads } from "@/lib/running-heads";
import type { BookFormat } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The Headers and footers settings on the Format tab, with a two-page sample that updates as you
 * change them. Each section can still hide its head or number, or shorten its head, from the
 * chapter settings in Write.
 */
export function HeadersFooters({ format, bookTitle, author, onChange }: { format: BookFormat; bookTitle: string; author: string; onChange: (patch: Partial<BookFormat>) => void }) {
  const h = runningHeads(format);
  const set = (patch: Partial<RunningHeads>) => onChange({ heads: { ...(format.heads ?? {}), ...patch }, ...(patch.left || patch.right ? { runningHeads: true } : {}) });
  const sample = { book: bookTitle || "Your Book", author: author || "Your Name", title: "The Long Table", part: "Part One", front: false, opener: false };
  const left = pageChrome(h, { ...sample, recto: false, folio: "12" });
  const right = pageChrome(h, { ...sample, recto: true, folio: "13" });

  return (
    <section>
      <h2 className="text-lg font-medium">Headers and footers</h2>
      <p className="mt-1 text-sm text-soft">What the top of each printed page says, and where the page number goes. Front matter and chapter openings never carry a running head; any chapter can hide its own or use a shorter title from its settings in Write.</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_15rem]">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <Select label="Left-hand pages" value={h.left} options={HEAD_CONTENT} onChange={(v) => set({ left: v })} />
          <Select label="Right-hand pages" value={h.right} options={HEAD_CONTENT} onChange={(v) => set({ right: v })} />
          <Select
            label="Head position"
            value={h.align}
            options={[
              ["outside", "Outside edge"],
              ["center", "Centred"],
            ]}
            onChange={(v) => set({ align: v })}
          />
          <Select
            label="Head lettering"
            value={h.style}
            options={[
              ["smallcaps", "Small capitals"],
              ["italic", "Italic"],
              ["plain", "Plain"],
            ]}
            onChange={(v) => set({ style: v })}
          />
          <Select label="Page numbers" value={h.folio} options={FOLIO_PLACES} onChange={(v) => set({ folio: v })} />
          <Select
            label="Number style"
            value={h.folioStyle}
            options={[
              ["plain", "12"],
              ["dashes", "– 12 –"],
              ["word", "Page 12"],
            ]}
            onChange={(v) => set({ folioStyle: v })}
          />
          <Check label="A fine line under the head" checked={h.rule} onChange={(v) => set({ rule: v })} />
          <Check label="Number chapter-opening pages" checked={h.openerFolio} onChange={(v) => set({ openerFolio: v })} disabled={h.folio === "none" || h.folio === "top-outside"} />
        </div>
        <div aria-label="Sample spread" className="mx-auto flex w-60 self-start shadow-sm">
          {[left, right].map((c, i) => (
            <div key={i} className={cn("relative h-48 flex-1 bg-white text-[#1c1a17]", i === 0 ? "border-r border-[#e8e3d9]" : "")}>
              <div className={cn("absolute inset-x-3 top-2.5 flex items-center gap-1 text-[7px] tracking-[0.06em]", h.rule && (c.head || (c.folioTop && c.folio)) && "border-b border-[#9d978c] pb-0.5")}>
                {c.folioTop && i === 0 && <span>{c.folio}</span>}
                <span className={cn("min-w-0 flex-1 truncate", c.headAlign === "center" ? "text-center" : c.headAlign === "right" ? "text-right" : "text-left", h.style === "smallcaps" && "uppercase", h.style === "italic" && "italic")}>{c.head}</span>
                {c.folioTop && i === 1 && <span>{c.folio}</span>}
              </div>
              <div className="absolute inset-x-3 top-7 grid gap-[3px]" aria-hidden>
                {Array.from({ length: 16 }, (_, k) => (
                  <span key={k} className="block h-[2px] rounded bg-[#d9d3c7]" style={{ width: k % 5 === 4 ? "60%" : "100%" }} />
                ))}
              </div>
              {!c.folioTop && c.folio && <div className={cn("absolute inset-x-3 bottom-2 text-[7px]", c.folioAlign === "center" ? "text-center" : c.folioAlign === "right" ? "text-right" : "text-left")}>{c.folio}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <label className="grid min-w-0 content-start gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="h-9 w-full min-w-0 rounded-md border border-input bg-card px-2">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function Check({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={cn("flex items-center gap-2 text-sm", disabled && "opacity-50")}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[var(--primary)]" />
      {label}
    </label>
  );
}
