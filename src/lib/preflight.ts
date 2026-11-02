import { orderedElements, type BookElement, type ExportInput } from "./book-model";
import { countWords, plainText, type DocNode } from "./doc/types";
import { cleanIsbn } from "./isbn";
import { HARDCOVER, getTrim, hardcoverTrim, maxPages, minPages, pageGeometry, type Binding } from "./kdp";
import { pictureWidth } from "./picture";
import { themeFor } from "./themes";
import { bookFormat, printEdition } from "./types";

/**
 * "Ready to publish?": the checks a store or printer would make, run before the author uploads
 * anything. Most rejections from KDP, Apple Books, Kobo and IngramSpark come from a short list of
 * things (a missing or small cover, the wrong page count, a broken ISBN, leftover placeholder
 * text), so each one is checked here and explained with what to do about it.
 */

export type Level = "stop" | "warn" | "tip";
export type Edition = "ebook" | "print" | "both";

export interface Finding {
  id: string;
  /** stop: a store will refuse it. warn: it will go through but looks wrong. tip: worth a look. */
  level: Level;
  edition: Edition;
  title: string;
  detail: string;
  /** the chapter to open to fix it */
  chapterId?: string;
}

export interface Measured {
  /** the ebook cover in pixels; null when there is none */
  cover?: { width: number; height: number } | null;
  /** pixel sizes of manuscript pictures, by src */
  images?: Map<string, { width: number; height: number }>;
}

/** KDP's ebook cover rules: at least 1000 x 625 px, ideally 2560 x 1600, about 1.6 tall to 1 wide. */
export const EBOOK_COVER = { minLong: 1000, minShort: 625, idealLong: 2560, idealShort: 1600 };
/** Apple Books wants at least 1400 px on the shorter side. */
export const APPLE_COVER_SHORT = 1400;
export const PRINT_DPI = 300;
/** below this a picture looks visibly soft in print */
export const SOFT_DPI = 200;
const TITLE_LIMIT = 200;
const DESCRIPTION_LIMIT = 4000;
const KEYWORD_LIMIT = 7;

const PLACEHOLDERS: { re: RegExp; label: string }[] = [
  { re: /lorem ipsum/i, label: "Lorem ipsum" },
  { re: /\[(?:insert|add|todo|tk|tbd|placeholder|name|citation)[^\]]{0,60}\]/i, label: "a [square bracket] note" },
  { re: /\b(?:TODO|TBD|FIXME|XXX)\b/, label: "a TODO note" },
  { re: /\bTK\b/, label: "TK (\"to come\")" },
];

const CAMERA_NAME = /^(?:img|dsc|dscn|pxl|image|photo|screenshot|screen shot|picture|untitled)?[\s_-]*\d[\d\s_.-]*$/i;

interface Picture {
  src: string;
  alt: string;
  width: number;
}

function pictures(node: DocNode | null | undefined, out: Picture[] = []): Picture[] {
  if (!node) return out;
  if (node.type === "image" && typeof node.attrs?.src === "string") {
    const alt = String(node.attrs.alt ?? "").trim();
    // a dropped-in photo starts with its file name ("IMG 2034"), which describes nothing
    out.push({ src: node.attrs.src, alt: CAMERA_NAME.test(alt) ? "" : alt, width: pictureWidth(node.attrs) });
  }
  for (const c of node.content ?? []) pictures(c, out);
  return out;
}

const name = (e: BookElement) => (e.label && e.title && e.label !== e.title ? `${e.label}: ${e.title}` : e.title || e.label || e.kind.label);

function snippet(text: string, at: number): string {
  const start = Math.max(0, at - 30);
  const s = text.slice(start, at + 40).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${s}…`;
}

/** Every check on a book, worst first. */
export function preflightBook(input: ExportInput, m: Measured = {}): Finding[] {
  const { book } = input;
  const f = bookFormat(book);
  const theme = themeFor(f);
  const out: Finding[] = [];
  const add = (x: Finding) => out.push(x);

  // ---- the details stores show
  const title = book.title?.trim() ?? "";
  if (!title) add({ id: "title", level: "stop", edition: "both", title: "Your book has no title", detail: "Add one on the Details tab. Every store needs it." });
  else if ((title + (book.subtitle ?? "")).length > TITLE_LIMIT)
    add({ id: "title-long", level: "stop", edition: "both", title: "Title and subtitle are too long", detail: `KDP allows ${TITLE_LIMIT} characters for the title and subtitle together; yours have ${(title + (book.subtitle ?? "")).length}. Shorten the subtitle on the Details tab.` });
  if (!input.author?.name?.trim()) add({ id: "author", level: "stop", edition: "both", title: "No author name", detail: "Pick or add the author on the Details tab. It goes on the title page, the cover and the store page." });
  const description = book.description?.trim() ?? "";
  if (!description) add({ id: "description", level: "warn", edition: "both", title: "No book description", detail: "Stores show it under your cover; it is what makes people buy. Write it on the Details tab." });
  else if (description.length > DESCRIPTION_LIMIT) add({ id: "description-long", level: "warn", edition: "both", title: "Description is too long for KDP", detail: `KDP takes up to ${DESCRIPTION_LIMIT} characters; yours has ${description.length}.` });
  const keywords = (book.keywords ?? []).filter((k) => k.trim());
  if (!keywords.length) add({ id: "keywords", level: "tip", edition: "both", title: "No keywords yet", detail: `KDP lets you give ${KEYWORD_LIMIT} search phrases. Readers find books through them. Add them on the Details tab.` });
  else if (keywords.length > KEYWORD_LIMIT) add({ id: "keywords-many", level: "tip", edition: "both", title: `${keywords.length} keywords`, detail: `KDP takes ${KEYWORD_LIMIT}. Put your best ones first; the rest are left out there.` });
  if (!book.language) add({ id: "language", level: "tip", edition: "ebook", title: "Book language isn't set", detail: "Reading apps use it for hyphenation, dictionaries and read-aloud voices. It is treated as English until you set it." });

  // ---- ISBNs
  const isbns: [string, string | undefined][] = [
    ["ebook", book.isbn_ebook],
    ["paperback", book.isbn_paperback],
    ["hardcover", book.isbn_hardcover],
  ];
  const seen = new Map<string, string>();
  for (const [edition, raw] of isbns) {
    if (!raw?.trim()) continue;
    const clean = cleanIsbn(raw);
    if (!clean) {
      add({ id: `isbn-${edition}`, level: "stop", edition: edition === "ebook" ? "ebook" : "print", title: `The ${edition} ISBN isn't valid`, detail: `"${raw.trim()}" fails the ISBN check digit. Copy it again from your ISBN agency (Bowker, Nielsen, or the free one KDP gives you).` });
      continue;
    }
    const other = seen.get(clean);
    if (other) add({ id: `isbn-dup-${edition}`, level: "stop", edition: "both", title: `The ${other} and ${edition} share an ISBN`, detail: "Each edition needs its own ISBN. Stores refuse a second edition with a number already in use." });
    seen.set(clean, edition);
  }

  // ---- the manuscript
  const elements = orderedElements(input.chapters, theme);
  const written = elements.filter((e) => !e.kind.smart);
  const words = written.reduce((s, e) => s + (e.chapter.word_count || countWords(e.chapter.content)), 0);
  if (!words) add({ id: "empty-book", level: "stop", edition: "both", title: "The book has no text yet", detail: "Write or import your manuscript on the Write tab first." });
  const picturesNoAlt: { e: BookElement; n: number }[] = [];
  const soft: { e: BookElement; dpi: number }[] = [];
  const geo = pageGeometry(f.trim, book.page_count || 200, f.bleed, "paperback", f.margins);
  const column = geo.pageWidth - geo.margins.inside - geo.margins.outside;
  for (const e of written) {
    const text = plainText(e.chapter.content);
    const body = e.section === "body" && (e.kind.id === "chapter" || e.kind.numbered);
    if (body && words && !(e.chapter.word_count || countWords(e.chapter.content)) && !e.chapter.options?.image)
      add({ id: `empty-${e.chapter.id}`, level: "warn", edition: "both", title: `${name(e)} is empty`, detail: "It will print as a blank chapter. Write it, or delete it on the Write tab.", chapterId: e.chapter.id });
    for (const p of PLACEHOLDERS) {
      const hit = p.re.exec(text);
      if (hit) {
        add({ id: `placeholder-${e.chapter.id}`, level: "warn", edition: "both", title: `${name(e)} still has ${p.label}`, detail: `"${snippet(text, hit.index)}" Search for it on the Write tab and replace it before you publish.`, chapterId: e.chapter.id });
        break;
      }
    }
    const pics = pictures(e.chapter.content);
    const noAlt = pics.filter((p) => !p.alt).length;
    if (noAlt) picturesNoAlt.push({ e, n: noAlt });
    for (const p of pics) {
      const px = m.images?.get(p.src);
      if (!px) continue;
      const dpi = Math.round(px.width / ((column * p.width) / 100));
      if (dpi < PRINT_DPI) soft.push({ e, dpi });
    }
  }
  if (picturesNoAlt.length) {
    const total = picturesNoAlt.reduce((s, x) => s + x.n, 0);
    add({
      id: "alt-text",
      level: "warn",
      edition: "ebook",
      title: `${total} ${total === 1 ? "picture has" : "pictures have"} no description`,
      detail: `Screen readers read the description aloud to blind readers, and Apple Books and the EU's accessibility rules ask for one. Right-click a picture on the Write tab and choose Alt text. First one: ${name(picturesNoAlt[0].e)}.`,
      chapterId: picturesNoAlt[0].e.chapter.id,
    });
  }
  if (soft.length) {
    const worst = soft.reduce((a, b) => (b.dpi < a.dpi ? b : a));
    add({
      id: "soft-pictures",
      level: worst.dpi < SOFT_DPI ? "warn" : "tip",
      edition: "print",
      title: `${soft.length} ${soft.length === 1 ? "picture prints" : "pictures print"} below ${PRINT_DPI} dpi`,
      detail: `The lowest is ${worst.dpi} dpi in ${name(worst.e)}. Printers ask for ${PRINT_DPI}; below ${SOFT_DPI} it looks soft. Use a larger picture, or make it smaller on the page.`,
      chapterId: worst.e.chapter.id,
    });
  }
  const kinds = new Set(input.chapters.map((c) => c.kind));
  if (words && !kinds.has("copyright")) add({ id: "copyright-page", level: "tip", edition: "both", title: "No copyright page", detail: "Most books have one after the title page. Add a Copyright page on the Write tab; it fills itself in from your details." });
  if (words && !kinds.has("title_page")) add({ id: "title-page", level: "tip", edition: "print", title: "No title page", detail: "Printed books open with one. Add a Title page on the Write tab." });

  // ---- ebook cover
  if (m.cover === null || (m.cover === undefined && !book.cover)) add({ id: "ebook-cover", level: "stop", edition: "ebook", title: "No ebook cover", detail: "Every store needs one. Add it on the Cover tab, or send one from Jollof Studio." });
  else if (m.cover) {
    const long = Math.max(m.cover.width, m.cover.height);
    const short = Math.min(m.cover.width, m.cover.height);
    const size = `${m.cover.width} x ${m.cover.height} px`;
    if (long < EBOOK_COVER.minLong || short < EBOOK_COVER.minShort)
      add({ id: "ebook-cover-small", level: "stop", edition: "ebook", title: "The ebook cover is too small", detail: `It is ${size}. KDP needs at least ${EBOOK_COVER.minShort} x ${EBOOK_COVER.minLong} px and recommends ${EBOOK_COVER.idealShort} x ${EBOOK_COVER.idealLong}.` });
    else if (short < APPLE_COVER_SHORT)
      add({ id: "ebook-cover-apple", level: "warn", edition: "ebook", title: "The cover is too small for Apple Books", detail: `It is ${size}. Apple wants at least ${APPLE_COVER_SHORT} px across; ${EBOOK_COVER.idealShort} x ${EBOOK_COVER.idealLong} works everywhere.` });
    else if (long < EBOOK_COVER.idealLong)
      add({ id: "ebook-cover-ideal", level: "tip", edition: "ebook", title: "The cover could be sharper", detail: `It is ${size}. ${EBOOK_COVER.idealShort} x ${EBOOK_COVER.idealLong} looks crisp on big tablet screens.` });
    const ratio = m.cover.height / m.cover.width;
    if (ratio < 1.3 || ratio > 1.9)
      add({ id: "ebook-cover-shape", level: "tip", edition: "ebook", title: "The cover is an unusual shape", detail: `It is ${ratio.toFixed(2)} times as tall as it is wide. Store shelves show covers at about 1.6, so it will sit in a box with bars.` });
  }

  // ---- print
  const editions: Binding[] = f.hardcover ? ["paperback", "hardcover"] : ["paperback"];
  for (const binding of editions) {
    const hard = binding === "hardcover";
    const { trim: trimId, paper } = printEdition(f, binding);
    const trim = hard ? hardcoverTrim(trimId) : getTrim(trimId);
    const pages = hard ? book.hardcover_page_count : book.page_count;
    const label = hard ? "hardcover" : "paperback";
    if (!pages) {
      if (words) add({ id: `pages-${binding}`, level: "warn", edition: "print", title: `The ${label} hasn't been built yet`, detail: `Build the ${label} interior on the Export tab. The real page count sets the spine, and the cover must match it.` });
    } else {
      const lo = minPages(binding);
      const hi = hard ? HARDCOVER.maxPages : maxPages(trim, paper, binding);
      if (pages < lo || pages > hi)
        add({ id: `pages-range-${binding}`, level: "stop", edition: "print", title: `The ${label} has ${pages} pages`, detail: `KDP prints ${label}s of ${lo} to ${hi} pages at this trim and paper. ${pages < lo ? "Add front or back matter, or pick a smaller trim size." : "Pick a larger trim size, or split the book."}` });
    }
    const coverFile = hard ? book.cover_hardcover : book.cover_full;
    if (!coverFile) add({ id: `print-cover-${binding}`, level: "warn", edition: "print", title: `No ${label} cover yet`, detail: `Make the full cover (back, spine and front) on the Cover tab, or in Jollof Studio and send it here.` });
  }

  const order: Record<Level, number> = { stop: 0, warn: 1, tip: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

export type StoreId = "kdp-ebook" | "apple" | "kobo" | "google" | "kdp-print" | "ingram";

export interface StoreStatus {
  id: StoreId;
  label: string;
  edition: "ebook" | "print";
  level: "ready" | Level;
  notes: string[];
}

const STORES: { id: StoreId; label: string; edition: "ebook" | "print" }[] = [
  { id: "kdp-ebook", label: "Kindle (KDP)", edition: "ebook" },
  { id: "apple", label: "Apple Books", edition: "ebook" },
  { id: "kobo", label: "Kobo", edition: "ebook" },
  { id: "google", label: "Google Play Books", edition: "ebook" },
  { id: "kdp-print", label: "KDP paperback", edition: "print" },
  { id: "ingram", label: "IngramSpark", edition: "print" },
];

/**
 * Where the book can go today. `epubcheck` is the error count from the last check, if one ran:
 * Apple, Kobo and Google refuse an EPUB with errors, while KDP converts it and usually copes.
 */
export function storeReadiness(findings: Finding[], book: Pick<ExportInput["book"], "isbn_paperback" | "isbn_ebook">, epubcheck?: { errors: number } | null): StoreStatus[] {
  return STORES.map((s) => {
    const mine = findings.filter((f) => f.edition === "both" || f.edition === s.edition).filter((f) => s.id !== "kdp-ebook" || f.id !== "ebook-cover-apple");
    const notes: string[] = [];
    let level: StoreStatus["level"] = "ready";
    const worse = (l: Level) => {
      if (level === "ready" || (l === "stop" && level !== "stop") || (l === "warn" && level === "tip")) level = l;
    };
    const stops = mine.filter((f) => f.level === "stop");
    if (stops.length) {
      worse("stop");
      notes.push(...stops.map((f) => f.title));
    } else if (mine.some((f) => f.level === "warn")) worse("warn");
    if (s.edition === "ebook" && epubcheck && epubcheck.errors > 0) {
      if (s.id === "kdp-ebook") {
        worse("warn");
        notes.push(`EPUBCheck found ${epubcheck.errors} ${epubcheck.errors === 1 ? "error" : "errors"}; KDP usually still converts it`);
      } else {
        worse("stop");
        notes.push(`EPUBCheck found ${epubcheck.errors} ${epubcheck.errors === 1 ? "error" : "errors"}, and this store refuses EPUBs with errors`);
      }
    }
    if (s.edition === "ebook" && !epubcheck && s.id !== "kdp-ebook") notes.push("Run Check with EPUBCheck to be sure");
    if (s.id === "ingram" && !book.isbn_paperback?.trim()) {
      worse("stop");
      notes.push("IngramSpark needs your own ISBN for the paperback (KDP's free ISBN only works on Amazon)");
    }
    if (s.id === "kdp-print" && !book.isbn_paperback?.trim()) notes.push("No ISBN: KDP gives you one free when you set up the paperback");
    if (s.id === "ingram") notes.push("IngramSpark prefers PDF/X-1a files; use the printer PDF");
    return { ...s, level, notes };
  });
}
