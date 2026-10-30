"use client";

import { useEffect, useState } from "react";
import { BookA, BookCopy, Minus, NotebookText, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessage, pb } from "@/lib/pb";
import { createChapter } from "@/lib/studio";
import { textStyle, themeFor, getTheme, type ThemeCustom } from "@/lib/themes";
import { bookFormat, type Book, type BookFormat } from "@/lib/types";
import type { DocNode } from "@/lib/doc/types";
import { useBlockLibrary } from "../block-library";
import { PromptDialog } from "../prompt-dialog";
import type { Workspace } from "./workspace";
import { cn } from "@/lib/utils";

function countMarks(n: DocNode | null | undefined, type: string): number {
  if (!n) return 0;
  return (n.marks?.some((m) => m.type === type) ? 1 : 0) + (n.content ?? []).reduce((s, c) => s + countMarks(c, type), 0);
}

function Row({ title, help, children }: { title: string; help: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border/70 py-3 last:border-0">
      <div className="min-w-0 flex-1 basis-56">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-[13px] text-soft">{help}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-border p-0.5">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn("rounded px-2.5 py-1 text-[13px]", value === v ? "bg-primary text-primary-foreground" : "text-ink-2 hover:bg-muted")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Stepper({ value, placeholder, min, max, step, unit, onChange, label }: { value: number | null; placeholder: string; min: number; max: number; step: number; unit: string; onChange: (v: number | undefined) => void; label: string }) {
  const v = value ?? Number(placeholder);
  const go = (d: number) => onChange(Math.round(Math.min(max, Math.max(min, v + d)) * 100) / 100);
  return (
    <span className="inline-flex items-center rounded-md border border-border">
      <button type="button" aria-label={`Less ${label}`} onClick={() => go(-step)} className="grid size-8 place-items-center text-ink-2 hover:bg-muted">
        <Minus className="size-3.5" />
      </button>
      <span className={cn("tabular w-16 text-center text-sm", value === null && "text-soft")}>
        {value === null ? `${placeholder} ${unit}` : `${v} ${unit}`}
      </span>
      <button type="button" aria-label={`More ${label}`} onClick={() => go(step)} className="grid size-8 place-items-center text-ink-2 hover:bg-muted">
        <Plus className="size-3.5" />
      </button>
      {value !== null && (
        <button type="button" onClick={() => onChange(undefined)} className="px-2 text-xs text-primary hover:underline">
          Theme
        </button>
      )}
    </span>
  );
}

/**
 * Edit styles: how text sits on the page in print, the ebook and the website. Justification,
 * hyphenation, spacing, indents, chapter openings, notes and the index, plus named styles saved to
 * the account and styles copied from another book.
 */
export function EditStyles({ ws }: { ws: Workspace }) {
  const f = bookFormat(ws.book);
  const theme = themeFor(f);
  const ts = textStyle(theme);
  const lib = useBlockLibrary();
  const save = (patch: Partial<BookFormat>) => ws.saveBook({ format: { ...f, ...patch } });
  const setCustom = (patch: ThemeCustom) => {
    const next: ThemeCustom = { ...(f.custom ?? {}), ...patch };
    for (const k of Object.keys(patch) as (keyof ThemeCustom)[]) if (patch[k] === undefined) delete next[k];
    return save({ custom: next });
  };
  const [naming, setNaming] = useState(false);
  const [error, setError] = useState("");
  const [others, setOthers] = useState<Pick<Book, "id" | "title" | "format">[] | null>(null);
  const [from, setFrom] = useState("");

  useEffect(() => {
    const me = pb().authStore.record?.id;
    if (!me) return;
    pb()
      .collection("books")
      .getFullList<Pick<Book, "id" | "title" | "format">>({ filter: pb().filter("owner = {:u} && id != {:b}", { u: me, b: ws.book.id }), fields: "id,title,format", sort: "title" })
      .then(setOthers)
      .catch(() => setOthers([]));
  }, [ws.book.id]);

  const has = (kind: string) => ws.chapters.some((c) => c.kind === kind);
  const terms = ws.chapters.reduce((s, c) => s + countMarks(c.content, "indexTerm"), 0);
  async function addPage(kind: "notes" | "index") {
    try {
      const order = Math.max(-1, ...ws.chapters.filter((c) => c.section === "back").map((c) => c.order)) + 1;
      const created = await ws.track(createChapter(ws.book, { kind, order }));
      ws.setChapters((all) => [...all, created]);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function applyLook(look: { theme: string; custom: ThemeCustom; fontSize?: number; lineHeight?: number }, what: string) {
    if (!confirm(`Use the styles of ${what} on this book? Its theme, fonts, colours and text settings replace this book's.`)) return;
    void save({ theme: look.theme, custom: look.custom ?? {}, ...(look.fontSize ? { fontSize: look.fontSize } : {}), ...(look.lineHeight ? { lineHeight: look.lineHeight } : {}) });
  }

  return (
    <div className="grid gap-6">
      <section>
        <h3 className="text-sm font-semibold tracking-[0.06em] text-soft uppercase">Text</h3>
        <Row title="Paragraphs" help="Indented paragraphs suit stories. Spaced blocks suit manuals and workbooks.">
          <Seg
            label="Paragraphs"
            value={theme.indent ? "indent" : "spaced"}
            onChange={(v) => setCustom({ indent: v === "indent" })}
            options={[
              ["indent", "Indented"],
              ["spaced", "Spaced"],
            ]}
          />
        </Row>
        <Row title="Justification" help="Justified text has straight edges on both sides, like most printed books. Ragged right keeps even word spacing.">
          <Seg
            label="Justification"
            value={ts.justify === null ? "theme" : ts.justify ? "on" : "off"}
            onChange={(v) => setCustom({ justify: v === "theme" ? undefined : v === "on" })}
            options={[
              ["theme", "Theme"],
              ["on", "Justified"],
              ["off", "Ragged right"],
            ]}
          />
        </Row>
        <Row title="Hyphenation" help="Breaks long words at the end of a line so justified text has fewer wide gaps. Headings are never hyphenated.">
          <Seg
            label="Hyphenation"
            value={ts.hyphenate ? "on" : "off"}
            onChange={(v) => setCustom({ hyphenate: v === "on" ? undefined : false })}
            options={[
              ["on", "On"],
              ["off", "Off"],
            ]}
          />
        </Row>
        <Row title="Space between paragraphs" help={theme.indent ? "Indented books usually have none. A little helps short paragraphs breathe." : "The gap between spaced paragraphs."}>
          <Stepper label="paragraph spacing" value={ts.paraSpacing} placeholder={theme.indent ? "0" : "0.8"} min={0} max={2} step={0.1} unit="em" onChange={(v) => setCustom({ paraSpacing: v })} />
        </Row>
        {theme.indent && (
          <Row title="Indent size" help="How far the first line of each paragraph steps in. One em is the width of the letter M.">
            <Stepper label="indent" value={ts.indentSize} placeholder="1.5" min={0} max={4} step={0.25} unit="em" onChange={(v) => setCustom({ indentSize: v })} />
          </Row>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold tracking-[0.06em] text-soft uppercase">Chapter openings</h3>
        <Row title="Space around the chapter title" help="Tight fits more on a page. Airy gives each chapter a grand start.">
          <Seg
            label="Space around the chapter title"
            value={ts.headingSpace <= 0.75 ? "tight" : ts.headingSpace >= 1.3 ? "airy" : "normal"}
            onChange={(v) => setCustom({ headingSpace: v === "tight" ? 0.7 : v === "airy" ? 1.4 : undefined })}
            options={[
              ["tight", "Tight"],
              ["normal", "Normal"],
              ["airy", "Airy"],
            ]}
          />
        </Row>
        <Row title="Chapter subtitle" help="How a chapter's subtitle is set under its title.">
          <Seg
            label="Chapter subtitle"
            value={ts.subtitleStyle}
            onChange={(v) => setCustom({ subtitleStyle: v === "italic" ? undefined : v })}
            options={[
              ["italic", "Italic"],
              ["smallcaps", "Small caps"],
              ["plain", "Plain"],
            ]}
          />
        </Row>
      </section>

      <section>
        <h3 className="text-sm font-semibold tracking-[0.06em] text-soft uppercase">Notes and index</h3>
        <Row title="Endnotes" help="At the end of each chapter, or all together on the Notes page at the back, under each chapter's title. Footnotes always stay on their page.">
          <div className="grid justify-items-end gap-1.5">
            <Seg
              label="Endnotes"
              value={ts.endnotes}
              onChange={(v) => setCustom({ endnotes: v === "book" ? "book" : undefined })}
              options={[
                ["chapter", "End of each chapter"],
                ["book", "Notes page"],
              ]}
            />
            {ts.endnotes === "book" && !has("notes") && (
              <Button size="sm" variant="outline" onClick={() => void addPage("notes")}>
                <NotebookText /> Add the Notes page
              </Button>
            )}
          </div>
        </Row>
        <Row
          title="Index"
          help={
            terms
              ? `${terms} ${terms === 1 ? "entry" : "entries"} marked. The Index page lists them A to Z with page numbers in print and links in the ebook.`
              : "Select a word or name in a chapter, right-click, and choose Research, then Add to the index. The Index page is then built for you."
          }
        >
          {!has("index") && (
            <Button size="sm" variant="outline" onClick={() => void addPage("index")}>
              <BookA /> Add the Index page
            </Button>
          )}
        </Row>
      </section>

      <section>
        <h3 className="text-sm font-semibold tracking-[0.06em] text-soft uppercase">Saved styles</h3>
        <p className="mt-1 text-[13px] text-soft">Save this book&apos;s whole look (theme, fonts, colours, blocks and the settings above) by name, then put it on any of your books.</p>
        <ul className="mt-3 grid gap-1.5">
          {lib.prefs.stylePresets.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{s.name}</span>
                <span className="block text-xs text-soft">{getTheme(s.theme).name} theme</span>
              </span>
              <Button size="sm" variant="outline" onClick={() => applyLook(s, `“${s.name}”`)}>
                Use on this book
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete ${s.name}`}
                onClick={() => {
                  if (confirm(`Delete the saved style “${s.name}”? Books already using it keep their look.`)) lib.removeStyle(s.id);
                }}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <Button size="sm" className="mt-3" onClick={() => setNaming(true)}>
          <Save /> Save these styles…
        </Button>
      </section>

      <section>
        <h3 className="text-sm font-semibold tracking-[0.06em] text-soft uppercase">Copy from another book</h3>
        {others === null ? (
          <p className="mt-1 text-sm text-soft">Loading your books…</p>
        ) : !others.length ? (
          <p className="mt-1 text-sm text-soft">This is your only book so far.</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Book to copy from" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-card px-2 text-sm">
              <option value="">Choose a book…</option>
              {others.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title || "Untitled"}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={!from}
              onClick={() => {
                const b = others.find((x) => x.id === from);
                if (!b) return;
                const bf = bookFormat(b);
                applyLook({ theme: bf.theme, custom: bf.custom ?? {}, fontSize: bf.fontSize, lineHeight: bf.lineHeight }, `“${b.title}”`);
              }}
            >
              <BookCopy /> Copy its styles
            </Button>
          </div>
        )}
      </section>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <PromptDialog
        open={naming}
        title="Save these styles"
        label="Name"
        placeholder="e.g. My workbook style"
        initial={ws.book.title ? `${ws.book.title} style` : ""}
        onClose={() => setNaming(false)}
        onSubmit={(v) => {
          if (v.trim()) lib.saveStyle({ name: v.trim().slice(0, 60), theme: f.theme, custom: f.custom ?? {}, fontSize: f.fontSize, lineHeight: f.lineHeight });
        }}
      />
    </div>
  );
}
