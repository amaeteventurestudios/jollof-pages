import { estimatePages, getTrim, spineWidth } from "./kdp";
import { fileUrl } from "./pb";
import { bookFormat, type Book } from "./types";

/** What the public site needs to draw a book as an object. */
export interface StageBook {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  cover: string;
  accent: string;
  trim: string;
  trimLabel: string;
  paper: string;
  pages: number;
  width: number;
  height: number;
}

const FALLBACK = ["#ad3a17", "#7a2e1d", "#1f4a6b", "#5a3d6b", "#2b2622"];

export function toStageBook(b: Book, i = 0): StageBook {
  const f = bookFormat(b);
  const trim = getTrim(f.trim);
  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    subtitle: b.subtitle,
    author: b.expand?.author?.name ?? "",
    cover: b.cover ? fileUrl(b, b.cover, "960x0") : "",
    accent: b.accent || FALLBACK[i % FALLBACK.length],
    trim: trim.id,
    trimLabel: `${trim.width} × ${trim.height} in`,
    paper: f.paper,
    pages: b.page_count || estimatePages(b.word_count || 0, f.trim, 10),
    width: trim.width,
    height: trim.height,
  };
}

export function spineOf(sb: Pick<StageBook, "pages" | "paper">): number {
  return spineWidth(sb.pages, sb.paper as Parameters<typeof spineWidth>[1]);
}

export function year(date: string | undefined): string {
  return date ? date.slice(0, 4) : "";
}

export function isUpcoming(b: Pick<Book, "publication_date">): boolean {
  return !!b.publication_date && new Date(b.publication_date) > new Date();
}

/** True when a colour is dark enough that cream text reads on it (WCAG relative luminance). */
export function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return true;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.18;
}
