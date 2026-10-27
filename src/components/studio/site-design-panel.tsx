"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/studio/book/details-tab";
import { errorMessage, fileUrl, pb } from "@/lib/pb";
import { cn } from "@/lib/utils";
import { coverColours, FONT_PAIRS, looksFromColours, PATTERNS, PRESETS, type Look, type SiteDesign } from "@/lib/site-design";
import type { Book, SiteSettings } from "@/lib/types";

const DEVICES = [
  { id: "desktop", label: "Desktop", width: 1280, icon: Monitor },
  { id: "tablet", label: "Tablet", width: 820, icon: Tablet },
  { id: "phone", label: "Phone", width: 390, icon: Smartphone },
] as const;

const ALL_FONTS_HREF = `https://fonts.googleapis.com/css2?${FONT_PAIRS.filter((f) => f.query)
  .map((f) => f.query)
  .join("&")}&display=swap`;

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Colours, fonts and pattern for an author site, with a live preview. Colour looks come from the
 * author's own covers first, the way their books already look on the shelf.
 */
export function SiteDesignPanel({ site, books, onSaved }: { site: SiteSettings; books: Book[]; onSaved: (s: SiteSettings) => void }) {
  const [design, setDesign] = useState<SiteDesign>(site.design ?? {});
  const [fromCovers, setFromCovers] = useState<{ book: Book; looks: Look[] }[]>([]);
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const covered = useMemo(() => books.filter((b) => b.cover).slice(0, 3), [books]);
  useEffect(() => {
    let live = true;
    Promise.all(
      covered.map(async (book) => {
        try {
          return { book, looks: looksFromColours(await coverColours(fileUrl(book, book.cover, "480x0"))) };
        } catch {
          return null;
        }
      }),
    ).then((rows) => live && setFromCovers(rows.filter((r): r is { book: Book; looks: Look[] } => !!r)));
    return () => {
      live = false;
    };
  }, [covered]);

  // the preview follows choices after a short pause, so clicking around stays quick
  const [previewSrc, setPreviewSrc] = useState("");
  useEffect(() => {
    if (!site.subdomain) return;
    const t = setTimeout(() => setPreviewSrc(`/sites/${encodeURIComponent(site.subdomain!)}?preview=${toBase64Url(JSON.stringify(design))}`), 300);
    return () => clearTimeout(t);
  }, [design, site.subdomain]);

  const chosen = JSON.stringify(design.palette ?? null);
  const pick = (look: Look) => setDesign((d) => ({ ...d, palette: look.design.palette, label: look.design.label }));

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const saved = await pb().collection("site_settings").update<SiteSettings>(site.id, { design });
      onSaved(saved);
      setMsg("Design saved. Your site shows it within a minute.");
    } catch (e) {
      setMsg(`Could not save: ${errorMessage(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Design" description="Colours made from your covers, a font pair and a pattern. Every colour pairing is checked so text stays easy to read.">
      <link rel="stylesheet" href={ALL_FONTS_HREF} />
      {fromCovers.map(({ book, looks }) => (
        <div key={book.id} className="grid gap-2">
          <p className="text-sm font-medium">From the cover of {book.title}</p>
          <Swatches looks={looks} chosen={chosen} onPick={pick} />
        </div>
      ))}
      {covered.length === 0 && <p className="text-sm text-soft">Add a cover to a book and colours made from it will show up here.</p>}
      <div className="grid gap-2">
        <p className="text-sm font-medium">Ready-made</p>
        <Swatches looks={PRESETS} chosen={chosen} onPick={pick} />
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium">Fonts</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {FONT_PAIRS.map((f) => {
            const on = (design.fonts ?? "archivo") === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={on}
                onClick={() => setDesign((d) => ({ ...d, fonts: f.id }))}
                className={cn("rounded-md border bg-card p-3 text-left", on ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-ink-2")}
              >
                <span className="block text-[22px] leading-tight" style={{ fontFamily: f.heading, fontStretch: f.wide ? "125%" : undefined, fontWeight: 700 }}>
                  The Book Inside You
                </span>
                <span className="mt-1 block text-[13px] text-soft" style={{ fontFamily: f.body }}>
                  {f.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium">Pattern</p>
        <div className="flex flex-wrap gap-2">
          {PATTERNS.map((p) => {
            const on = (design.pattern ?? "adire") === p.id;
            return (
              <Button key={p.id} type="button" size="sm" variant={on ? "default" : "outline"} onClick={() => setDesign((d) => ({ ...d, pattern: p.id }))}>
                {p.label}
              </Button>
            );
          })}
        </div>
      </div>

      {previewSrc && (
        <div className="grid gap-2">
          <div className="flex items-center gap-1">
            <p className="mr-auto text-sm font-medium">Preview</p>
            {DEVICES.map((d) => (
              <Button key={d.id} type="button" size="sm" variant={device === d.id ? "secondary" : "ghost"} aria-pressed={device === d.id} onClick={() => setDevice(d.id)}>
                <d.icon /> <span className="hidden sm:inline">{d.label}</span>
              </Button>
            ))}
          </div>
          <Preview src={previewSrc} width={DEVICES.find((d) => d.id === device)!.width} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save design"}
        </Button>
        <span className="text-sm text-soft" role="status">
          {msg}
        </span>
      </div>
    </Panel>
  );
}

function Swatches({ looks, chosen, onPick }: { looks: Look[]; chosen: string; onPick: (l: Look) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {looks.map((l) => {
        const p = l.design.palette!;
        const on = JSON.stringify(p) === chosen;
        return (
          <button key={l.id} type="button" aria-pressed={on} onClick={() => onPick(l)} className={cn("overflow-hidden rounded-md border text-left", on ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-ink-2")}>
            <span className="flex h-14 items-end p-2 text-[13px] font-semibold" style={{ background: p.hero, color: p.light }}>
              Aa
              <span className="ml-auto inline-block h-5 w-8" style={{ background: p.accent }} />
            </span>
            <span className="flex h-3">
              <span className="flex-1" style={{ background: p.deep }} />
              <span className="flex-1" style={{ background: p.light }} />
            </span>
            <span className="flex items-center gap-1 bg-card px-2 py-1.5 text-[13px]">
              {on && <Check className="size-3.5 text-primary" />}
              {l.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The site at a real device width, scaled down to fit the panel. */
function Preview({ src, width }: { src: string; width: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(800);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.min(1, avail / width);
  const height = 720;
  return (
    <div ref={box} className="overflow-hidden rounded-md border border-border bg-muted" style={{ height: height * scale }}>
      <iframe
        title="Preview of your website"
        src={src}
        className="block origin-top-left bg-white"
        style={{ width, height, transform: `scale(${scale})`, marginLeft: Math.max(0, (avail - width * scale) / 2) }}
      />
    </div>
  );
}
