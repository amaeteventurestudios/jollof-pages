import { coverGeometry, getTrim, hardcoverTrim, inches, TRIM_SIZES, type Binding, type CoverGeometry, type PaperType } from "./kdp";

/**
 * Covers sent from Jollof Studio ("Send to Jollof Pages"). Studio opens /studio/cover-import in a
 * new tab and passes the files with postMessage once this page says it is ready; nothing goes
 * through a server. These helpers decide whether a message is a real cover from Studio and whether
 * the cover fits the book it is going on, which is where most print covers go wrong: a spine made
 * for an older page count, or a cover made for another trim size.
 */

/** Where Studio runs (Jollof Studio, and the same app as Canvas AX). Messages from anywhere else are ignored; the first is where the Cover tab links. */
export const STUDIO_ORIGINS = (process.env.NEXT_PUBLIC_STUDIO_ORIGINS || "https://studio.jollofpages.com,https://canvas.amaete.com")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);

export const STUDIO_URL = STUDIO_ORIGINS[0];

const PAPERS: PaperType[] = ["white", "cream", "color-standard", "color-premium"];

/** The largest files the book's cover fields take (see the books collection). */
export const MAX_PRINT_COVER = 50 * 1024 * 1024;
export const MAX_EBOOK_COVER = 15 * 1024 * 1024;

export interface ReceivedCover {
  book?: string;
  binding: Binding;
  trimWidth: number;
  trimHeight: number;
  pages: number;
  paper: PaperType;
  title: string;
  pdf: Blob;
  front: Blob;
}

/** A cover from Studio, or the reason the message can't be used. */
export function readHandoff(data: unknown): ReceivedCover | { error: string } {
  if (!data || typeof data !== "object") return { error: "Nothing arrived from Jollof Studio." };
  const d = data as Record<string, unknown>;
  if (d.type !== "jp-cover") return { error: "That wasn't a cover from Jollof Studio." };
  if (d.version !== 1) return { error: "This cover came from a newer Jollof Studio. Reload this page and send it again." };
  const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : null);
  const trimWidth = num(d.trimWidth, 3, 14);
  const trimHeight = num(d.trimHeight, 3, 14);
  const pages = num(d.pages, 1, 1200);
  if (trimWidth === null || trimHeight === null || pages === null) return { error: "The cover's size details are missing. Send it again from Jollof Studio." };
  if (d.binding !== "paperback" && d.binding !== "hardcover") return { error: "The cover doesn't say whether it is a paperback or a hardcover." };
  if (!PAPERS.includes(d.paper as PaperType)) return { error: "The cover doesn't say which paper it was made for." };
  if (!(d.pdf instanceof Blob) || !(d.front instanceof Blob)) return { error: "The cover files didn't come through. Send it again from Jollof Studio." };
  if (d.pdf.type !== "application/pdf") return { error: "The full cover should be a PDF." };
  if (d.front.type !== "image/jpeg") return { error: "The front cover should be a JPEG." };
  if (d.pdf.size > MAX_PRINT_COVER) return { error: `The cover PDF is ${mb(d.pdf.size)}; a book takes up to ${mb(MAX_PRINT_COVER)}. Use fewer or smaller photos, then send it again.` };
  const book = typeof d.book === "string" && /^[a-z0-9]{1,30}$/.test(d.book) ? d.book : undefined;
  return {
    book,
    binding: d.binding,
    trimWidth,
    trimHeight,
    pages: Math.round(pages),
    paper: d.paper as PaperType,
    title: typeof d.title === "string" ? d.title.slice(0, 200) : "",
    pdf: d.pdf,
    front: d.front,
  };
}

const mb = (n: number) => `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`;

export interface CoverCheck {
  /** "ok": save it. "warn": it will print, but something should be fixed first. "stop": KDP will reject it. */
  level: "ok" | "warn" | "stop";
  /** plain-language findings, worst first */
  notes: string[];
  /** the sheet this book needs */
  expected: CoverGeometry;
}

/** How far the real sheet may differ from the expected one: well inside KDP's own spine tolerance. */
const TOLERANCE = 0.02;

/**
 * Check a cover against the book it is going on.
 * `sheet` is the PDF's real page size in inches; `bookPages` is the book's page count now.
 */
export function checkCover(
  cover: Pick<ReceivedCover, "binding" | "trimWidth" | "trimHeight" | "pages" | "paper">,
  sheet: { width: number; height: number },
  book: { trim: string; paper: PaperType; pages: number; pagesEstimated: boolean },
): CoverCheck {
  const expected = coverGeometry(book.trim, book.pages, book.paper, cover.binding);
  if (!TRIM_SIZES.some((t) => t.id === trimIdFor(cover.trimWidth, cover.trimHeight))) {
    return { level: "stop", expected, notes: [`This cover is ${fmt(cover.trimWidth)} x ${fmt(cover.trimHeight)} in, which isn't a size KDP prints. In Jollof Studio, open Book cover and pick your book's trim size.`] };
  }
  const made = coverGeometry(trimIdFor(cover.trimWidth, cover.trimHeight), cover.pages, cover.paper, cover.binding);
  const notes: string[] = [];
  let level: CoverCheck["level"] = "ok";
  const bookTrim = cover.binding === "hardcover" ? hardcoverTrim(book.trim) : getTrim(book.trim);
  const edition = cover.binding === "hardcover" ? "hardcover" : "paperback";

  // 1. the PDF must be the size the cover says it is (a broken export, or the wrong file)
  if (Math.abs(sheet.width - made.width) > TOLERANCE || Math.abs(sheet.height - made.height) > TOLERANCE) {
    level = "stop";
    notes.push(`The PDF is ${inches(sheet.width)} x ${inches(sheet.height)}, but a cover with these settings should be ${inches(made.width)} x ${inches(made.height)}. Send it again from Jollof Studio.`);
  }
  // 2. same trim size
  if (Math.abs(cover.trimWidth - bookTrim.width) > 0.001 || Math.abs(cover.trimHeight - bookTrim.height) > 0.001) {
    level = "stop";
    notes.push(
      `This cover is for a ${fmt(cover.trimWidth)} x ${fmt(cover.trimHeight)} in book, but your ${edition} is ${fmt(bookTrim.width)} x ${fmt(bookTrim.height)} in. In Jollof Studio, open Book cover and set the trim size to ${fmt(bookTrim.width)} x ${fmt(bookTrim.height)}, or change the trim on the Format tab here.`,
    );
  }
  // 3. the spine: page count and paper
  if (level !== "stop") {
    const diff = made.spine - expected.spine;
    if (Math.abs(diff) > TOLERANCE / 2) {
      level = "warn";
      const why =
        cover.pages !== book.pages && cover.paper !== book.paper
          ? `${cover.pages} pages on ${cover.paper} paper, but your book is ${book.pages} pages on ${book.paper} paper`
          : cover.pages !== book.pages
            ? `${cover.pages} pages, but your book is now ${book.pages} pages`
            : `${cover.paper} paper, but your book prints on ${book.paper} paper`;
      notes.push(
        `The spine is ${inches(made.spine, 3)} wide but your book needs ${inches(expected.spine, 3)}: this cover was made for ${why}. KDP will reject a cover with the wrong spine. In Jollof Studio, open Book cover, set ${cover.pages !== book.pages ? `the page count to ${book.pages}` : `the paper to ${book.paper}`}, and send it again.`,
      );
    } else if (cover.pages !== book.pages) {
      notes.push(`Made for ${cover.pages} pages; your book is ${book.pages}. The spine works out the same width, so it fits.`);
    }
  }
  if (book.pagesEstimated && level !== "stop") {
    notes.push(`Your page count (${book.pages}) is an estimate until you build the print PDF on the Publish tab. Check the cover again then; the spine depends on it.`);
  }
  if (cover.binding === "paperback" && !expected.spineTextAllowed) {
    notes.push(`KDP allows no text on the spine under 79 pages. Make sure the spine on this cover is blank.`);
  }
  return { level, notes, expected };
}

/** The trim id for a size (ids are like "6x9" or "5.5x8.5"). */
function trimIdFor(w: number, h: number): string {
  return `${fmt(w)}x${fmt(h)}`;
}

const fmt = (n: number) => String(Number(n.toFixed(3)));

