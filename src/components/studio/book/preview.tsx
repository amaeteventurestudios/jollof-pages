"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BookOpen, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Maximize2, Minus, Plus } from "lucide-react";
import { FullBookPreview } from "./full-book-preview";
import { elementHtml } from "@/lib/render-element";
import { orderedElements } from "@/lib/book-model";
import { themeCss } from "@/lib/theme-css";
import { themeFor, THEME_FONTS_HREFS } from "@/lib/themes";
import { getTrim, hardcoverTrim, pageGeometry } from "@/lib/kdp";
import { bookFormat, type Book, type Chapter } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Reading devices, drawn at roughly their real proportions. Sizes are CSS pixels of the screen;
 * the bezel is padding around it (top, right, bottom, left), wider on the side with buttons.
 */
interface Device {
  id: string;
  label: string;
  group: string;
  w: number;
  h: number;
  bezel: [number, number, number, number];
  radius: number;
  screenRadius: number;
  body: string;
  /** e-ink screens are warm grey; glass screens white */
  eink?: boolean;
  /** base text size in px at 100% */
  text: number;
  /** what the device calls its default book font */
  font: string;
  notch?: boolean;
}

const DEVICES: Device[] = [
  { id: "iphone", label: "iPhone", group: "Apple", w: 390, h: 800, bezel: [12, 12, 12, 12], radius: 54, screenRadius: 44, body: "#1b1b1d", text: 17, font: "Palatino", notch: true },
  { id: "ipad", label: "iPad", group: "Apple", w: 640, h: 880, bezel: [24, 24, 24, 24], radius: 38, screenRadius: 14, body: "#1b1b1d", text: 18, font: "Palatino" },
  { id: "galaxy-s21", label: "Galaxy S21", group: "Android", w: 380, h: 800, bezel: [10, 10, 10, 10], radius: 42, screenRadius: 34, body: "#202124", text: 16, font: "Literata" },
  { id: "galaxy-tab", label: "Galaxy Tab S7", group: "Android", w: 600, h: 940, bezel: [22, 22, 22, 22], radius: 26, screenRadius: 8, body: "#202124", text: 18, font: "Literata" },
  { id: "kindle-fire", label: "Fire HD 8", group: "Kindle", w: 500, h: 800, bezel: [40, 26, 40, 26], radius: 26, screenRadius: 4, body: "#232323", text: 17, font: "Literata" },
  { id: "kindle-paperwhite", label: "Paperwhite", group: "Kindle", w: 440, h: 586, bezel: [26, 26, 26, 26], radius: 24, screenRadius: 2, body: "#2a2a2a", eink: true, text: 16, font: "Literata" },
  { id: "kindle-oasis", label: "Oasis", group: "Kindle", w: 460, h: 612, bezel: [26, 26, 26, 92], radius: 22, screenRadius: 2, body: "#3a3b3d", eink: true, text: 16, font: "Literata" },
  { id: "nook-gl3", label: "Glowlight 3", group: "Nook", w: 400, h: 540, bezel: [40, 46, 64, 46], radius: 20, screenRadius: 2, body: "#2d2d2d", eink: true, text: 16, font: "Georgia" },
  { id: "nook-glplus", label: "Glowlight Plus", group: "Nook", w: 500, h: 666, bezel: [30, 30, 30, 30], radius: 22, screenRadius: 2, body: "#2d2d2d", eink: true, text: 16, font: "Georgia" },
  { id: "kobo-forma", label: "Forma", group: "Kobo", w: 520, h: 694, bezel: [26, 26, 26, 92], radius: 20, screenRadius: 2, body: "#1f1f1f", eink: true, text: 16, font: "Georgia" },
  { id: "kobo-libra", label: "Libra H2O", group: "Kobo", w: 460, h: 612, bezel: [26, 26, 26, 86], radius: 20, screenRadius: 2, body: "#242424", eink: true, text: 16, font: "Georgia" },
  { id: "kobo-clara", label: "Clara", group: "Kobo", w: 400, h: 534, bezel: [30, 30, 46, 30], radius: 20, screenRadius: 2, body: "#1f1f1f", eink: true, text: 16, font: "Georgia" },
  { id: "kobo-nia", label: "Nia", group: "Kobo", w: 400, h: 534, bezel: [28, 28, 44, 28], radius: 18, screenRadius: 2, body: "#2a2a2a", eink: true, text: 16, font: "Georgia" },
];
const GROUPS = ["Apple", "Android", "Kindle", "Nook", "Kobo"];

/** Fonts a reader can pick on their device. "book" keeps the interior theme's font. */
const FONTS: { id: string; label: string; css: string }[] = [
  { id: "book", label: "Book's own font", css: "" },
  { id: "Literata", label: "Literata (Bookerly-like)", css: "Literata, Georgia, serif" },
  { id: "Georgia", label: "Georgia", css: "Georgia, serif" },
  { id: "Palatino", label: "Palatino", css: "Palatino, 'Palatino Linotype', 'Book Antiqua', 'URW Palladio L', serif" },
  { id: "Iowan", label: "Iowan", css: "'Iowan Old Style', 'Palatino Linotype', Georgia, serif" },
  { id: "NewYork", label: "New York", css: "ui-serif, 'New York', Georgia, serif" },
  { id: "Charter", label: "Charter", css: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, serif" },
  { id: "SanFrancisco", label: "San Francisco", css: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { id: "Lora", label: "Lora", css: "Lora, Georgia, serif" },
  { id: "Garamond", label: "EB Garamond", css: "'EB Garamond', Garamond, serif" },
  { id: "SourceSerif", label: "Source Serif", css: "'Source Serif 4', Georgia, serif" },
];

const GAP = 48;

function readPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function writePref(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // private window: preferences just don't stick
  }
}

/**
 * Live preview in the book's interior theme, one page at a time like a real reader: turn pages and
 * chapters, zoom, and switch device and font.
 */
export function Preview({ book, chapters, chapterId, onSelect }: { book: Book; chapters: Chapter[]; chapterId: string | null; onSelect?: (id: string) => void }) {
  // the Desk's book pages only render in the browser, so saved preferences can seed state directly
  const [deviceId, setDeviceId] = useState(() => readPref("jp-preview-device", "print"));
  const [fontId, setFontId] = useState(() => readPref("jp-preview-font", "book"));
  const [textScale, setTextScale] = useState(() => readPref("jp-preview-text", 1));
  const [zoom, setZoom] = useState<number | "fit">(() => readPref<number | "fit">("jp-preview-zoom", "fit"));
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [fullBook, setFullBook] = useState(false);
  const goLast = useRef(false);

  const format = bookFormat(book);
  const theme = themeFor(format);
  const elements = orderedElements(chapters, theme);
  const index = Math.max(
    0,
    elements.findIndex((e) => e.chapter.id === chapterId),
  );
  const el = elements[index];
  const html = el ? elementHtml(el, { book, author: book.expand?.author ?? null, alsoBy: [] }, elements, theme) : "";
  const css = themeCss(theme, { scope: ".jp-preview", dropCaps: format.dropCaps, lineHeight: format.lineHeight });
  // "print" is the paperback; "hardcover" its own trim and wider gutter
  const binding = deviceId === "hardcover" && format.hardcover ? "hardcover" : "paperback";
  const print = deviceId === "print" || deviceId === "hardcover";
  const device = DEVICES.find((d) => d.id === deviceId) ?? DEVICES[0];
  const font = FONTS.find((f) => f.id === fontId) ?? FONTS[0];

  // the page: a trim at 72 px per inch with KDP margins, or the device screen
  // strings only: the compiler can't tell that a helper given the whole format leaves it alone
  const hardTrimId = hardcoverTrim(format.hardcoverTrim || format.trim).id;
  const editionTrim = binding === "hardcover" ? hardTrimId : format.trim;
  const trim = getTrim(editionTrim);
  const paperLabel = getTrim(format.trim).label;
  const hardLabel = getTrim(hardTrimId).label;
  const hasHardcover = format.hardcover;
  const g = pageGeometry(editionTrim, (binding === "hardcover" ? book.hardcover_page_count : book.page_count) || 200, false, binding, format.margins);
  const PPI = 72;
  const recto = page % 2 === 0;
  const screen = print
    ? {
        w: trim.width * PPI,
        h: trim.height * PPI,
        pad: [g.margins.top * PPI, (recto ? g.margins.outside : g.margins.inside) * PPI, g.margins.bottom * PPI, (recto ? g.margins.inside : g.margins.outside) * PPI],
        text: (format.largePrint ? 16 : format.fontSize) * (PPI / 72),
      }
    : { w: device.w, h: device.h, pad: [device.notch ? 64 : 36, 30, 40, 30], text: device.text * textScale };
  const innerW = screen.w - screen.pad[1] - screen.pad[3];
  const innerH = screen.h - screen.pad[0] - screen.pad[2];
  const outerW = print ? screen.w : screen.w + device.bezel[1] + device.bezel[3];
  const outerH = print ? screen.h : screen.h + device.bezel[0] + device.bezel[2];

  // fit the device into the panel unless a zoom is chosen
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 400, h: 600 });
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const ro = new ResizeObserver(([e]) => setStage({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);
  const fit = Math.max(0.2, Math.min((stage.w - 32) / outerW, (stage.h - 32) / outerH));
  const z = zoom === "fit" ? fit : zoom;

  // paginate with CSS columns and count how many the element fills
  // a new chapter opens on its first page, or on its last when we arrived by paging back
  const flowRef = useRef<HTMLDivElement>(null);
  const shownId = useRef<string | undefined>(undefined);
  const currentId = el?.chapter.id;
  const measure = useCallback(() => {
    const flow = flowRef.current;
    if (!flow) return;
    const n = Math.max(1, Math.round((flow.scrollWidth + GAP) / (innerW + GAP)));
    setPages(n);
    if (shownId.current !== currentId) {
      setPage(goLast.current ? n - 1 : 0);
      shownId.current = currentId;
      goLast.current = false;
    } else setPage((p) => Math.min(p, n - 1));
  }, [innerW, currentId]);
  useLayoutEffect(measure, [measure, html, deviceId, fontId, textScale, innerH]);
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => live && measure());
    const imgs = flowRef.current?.querySelectorAll("img") ?? [];
    imgs.forEach((i) => i.addEventListener("load", measure, { once: true }));
    return () => {
      live = false;
    };
  }, [measure, html]);

  const goChapter = (i: number, last = false) => {
    const target = elements[i];
    if (!target || !onSelect) return;
    goLast.current = last;
    onSelect(target.chapter.id);
  };
  const next = () => (page < pages - 1 ? setPage(page + 1) : goChapter(index + 1));
  const prev = () => (page > 0 ? setPage(page - 1) : goChapter(index - 1, true));

  // the mouse wheel and arrow keys turn pages
  const wheelAt = useRef(0);
  function onWheel(e: React.WheelEvent) {
    // zoomed past the panel: the wheel moves around the page instead
    const s = stageRef.current;
    if (s && (s.scrollHeight > s.clientHeight + 2 || s.scrollWidth > s.clientWidth + 2)) return;
    const now = Date.now();
    const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(d) < 12 || now - wheelAt.current < 350) return;
    wheelAt.current = now;
    if (d > 0) next();
    else prev();
  }
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      prev();
    }
  }

  const setPref =
    <T,>(key: string, set: (v: T) => void) =>
    (v: T) => {
      set(v);
      writePref(key, v);
    };
  const changeZoom = (delta: number) => setPref<number | "fit">("jp-preview-zoom", setZoom)(Math.min(3, Math.max(0.25, Math.round((z + delta) * 20) / 20)));

  const pageNo = print ? `${page + 1} / ${pages}` : `Page ${page + 1} of ${pages}`;
  const runningHead = print && format.runningHeads && page > 0 && el && el.section !== "front" && !el.options.hideHeader ? (recto ? el.title : book.title) : "";
  const screenBg = print ? "#ffffff" : device.eink ? "#f2f1ec" : "#ffffff";

  return (
    <div className="flex h-full flex-col">
      {THEME_FONTS_HREFS.map((href) => (
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style>{`${css}
.jp-flow img { max-height: ${Math.floor(innerH * 0.9)}px; object-fit: contain; }
.jp-flow figure, .jp-flow .chapter-head, .jp-flow img { break-inside: avoid; }
.jp-flow .chapter-head { margin-top: ${print ? "4em" : "2em"}; }
${font.css ? `.jp-flow, .jp-flow p, .jp-flow li { font-family: ${font.css}; }` : ""}`}</style>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <select
          aria-label="Preview device"
          value={deviceId}
          onChange={(e) => {
            setPref("jp-preview-device", setDeviceId)(e.target.value);
            setPage(0);
          }}
          className="h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-2 text-sm"
        >
          <optgroup label="Print, at your trim size">
            <option value="print">Paperback ({paperLabel})</option>
            {hasHardcover && <option value="hardcover">Hardcover ({hardLabel})</option>}
          </optgroup>
          {GROUPS.map((grp) => (
            <optgroup key={grp} label={grp}>
              {DEVICES.filter((d) => d.group === grp).map((d) => (
                <option key={d.id} value={d.id}>
                  {grp === "Kindle" ? `Kindle ${d.label}` : d.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setFullBook(true)}
          title="Page through the whole printed book, two pages at a time"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-primary/60 px-2.5 text-sm font-medium text-primary hover:bg-primary-soft"
        >
          <BookOpen className="size-4" aria-hidden /> Full book preview
        </button>
        {fullBook && <FullBookPreview book={book} chapters={chapters} startChapterId={chapterId} onClose={() => setFullBook(false)} />}
        {!print && (
          <select
            aria-label="Reader font"
            value={fontId}
            onChange={(e) => setPref("jp-preview-font", setFontId)(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-2 text-sm"
          >
            {FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {!print && (
        <div className="flex items-center gap-3 border-b border-border px-3 py-1.5 text-sm">
          <span className="text-[13px] text-soft">Text size</span>
          <span className="text-xs text-soft" aria-hidden>
            A
          </span>
          <input
            type="range"
            min={0.75}
            max={1.6}
            step={0.05}
            value={textScale}
            onChange={(e) => setPref("jp-preview-text", setTextScale)(Number(e.target.value))}
            aria-label="Text size"
            className="min-w-0 flex-1 accent-[var(--primary)]"
          />
          <span className="text-base text-soft" aria-hidden>
            A
          </span>
        </div>
      )}

      <div
        ref={stageRef}
        tabIndex={0}
        onWheel={onWheel}
        onKeyDown={onKey}
        aria-label="Book preview. Use the arrow keys or scroll to turn pages."
        className="relative min-h-0 flex-1 overflow-auto bg-paper outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="flex min-h-full min-w-full items-center justify-center p-4" style={{ width: outerW * z + 32 > stage.w ? outerW * z + 32 : undefined }}>
          <div style={{ width: outerW * z, height: outerH * z }} className="shrink-0">
            <div style={{ width: outerW, height: outerH, transform: `scale(${z})`, transformOrigin: "0 0" }}>
              <div
                className={cn("relative", print && "shadow-[0_1px_4px_rgba(0,0,0,0.18)]")}
                style={
                  print
                    ? { width: outerW, height: outerH }
                    : {
                        width: outerW,
                        height: outerH,
                        background: device.body,
                        borderRadius: device.radius,
                        padding: `${device.bezel[0]}px ${device.bezel[1]}px ${device.bezel[2]}px ${device.bezel[3]}px`,
                        boxShadow: "0 18px 40px -18px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.06)",
                      }
                }
              >
                <div
                  className="jp-preview relative overflow-hidden text-[#1a1a1a]"
                  style={{ width: screen.w, height: screen.h, background: screenBg, borderRadius: print ? 0 : device.screenRadius, fontSize: screen.text }}
                >
                  {!print && device.notch && <span aria-hidden className="absolute top-3 left-1/2 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />}
                  {runningHead && (
                    <div
                      className="absolute truncate text-[0.72em] tracking-[0.08em] uppercase opacity-70"
                      style={{ left: screen.pad[3], right: screen.pad[1], top: screen.pad[0] * 0.45, textAlign: recto ? "right" : "left" }}
                    >
                      {runningHead}
                    </div>
                  )}
                  <div className="absolute overflow-hidden" style={{ top: screen.pad[0], left: screen.pad[3], width: innerW, height: innerH }}>
                    <div
                      ref={flowRef}
                      className="jp-flow h-full"
                      style={{ columnWidth: innerW, columnGap: GAP, columnFill: "auto", width: innerW, transform: `translateX(${-page * (innerW + GAP)}px)`, transition: "transform 180ms ease" }}
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  </div>
                  <div
                    className="absolute right-0 left-0 text-[0.72em] opacity-60"
                    style={{ bottom: screen.pad[2] * 0.35, textAlign: "center", fontFamily: print ? undefined : "system-ui, sans-serif" }}
                  >
                    {print ? (page === 0 || el?.options.hidePageNumber ? "" : page + 1) : pageNo}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-2 border-t border-border px-3 py-2.5">
        <div className="grid grid-cols-2 gap-2">
          <NavButton label="Previous page" onClick={prev} disabled={page === 0 && index === 0}>
            <ChevronLeft className="size-4" /> Page
          </NavButton>
          <NavButton label="Next page" onClick={next} disabled={page >= pages - 1 && index >= elements.length - 1}>
            Page <ChevronRight className="size-4" />
          </NavButton>
          <NavButton label="Previous chapter" onClick={() => goChapter(index - 1)} disabled={index === 0 || !onSelect}>
            <ChevronFirst className="size-4" /> Chapter
          </NavButton>
          <NavButton label="Next chapter" onClick={() => goChapter(index + 1)} disabled={index >= elements.length - 1 || !onSelect}>
            Chapter <ChevronLast className="size-4" />
          </NavButton>
        </div>
        <div className="flex items-center justify-between gap-2 text-[14px] text-ink">
          <span className="tabular truncate font-medium">
            {el ? `${el.title} · ` : ""}
            {pageNo}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <IconButton label="Zoom out" onClick={() => changeZoom(-0.1)}>
              <Minus className="size-3.5" />
            </IconButton>
            <span className="tabular w-11 text-center font-semibold">{Math.round(z * 100)}%</span>
            <IconButton label="Zoom in" onClick={() => changeZoom(0.1)}>
              <Plus className="size-3.5" />
            </IconButton>
            <IconButton label="Fit to panel" onClick={() => setPref<number | "fit">("jp-preview-zoom", setZoom)("fit")} active={zoom === "fit"}>
              <Maximize2 className="size-3.5" />
            </IconButton>
          </div>
        </div>
        <p className="text-[13px] font-medium text-ink/80">
          {print
            ? `${binding === "hardcover" ? "Hardcover" : "Paperback"} at ${trim.label}, ${theme.name} theme. Change the trim size on the Format tab.`
            : `${theme.name} theme. Readers can change the font and size on their own device.`}
        </p>
      </div>
    </div>
  );
}

function NavButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-primary/60 bg-card text-sm font-medium text-primary transition hover:bg-primary-soft disabled:border-border disabled:text-soft disabled:hover:bg-card"
    >
      {children}
    </button>
  );
}

function IconButton({ label, onClick, children, active }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cn("grid size-7 place-items-center rounded-md text-ink-2 hover:bg-paper-2", active && "bg-paper-2 text-ink")}>
      {children}
    </button>
  );
}
