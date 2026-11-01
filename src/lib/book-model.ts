import { elementKind, type ElementKind } from "./elements";
import { capitalize, chapterLabel, numberWord, type InteriorTheme } from "./themes";
import { chapterOptions, type Author, type Book, type BookFormat, type Chapter, type ChapterOptions, type Section } from "./types";
import { isLibraryBackground } from "./background-ref";
import { collectImages } from "./doc/types";
import { withoutSuggestions } from "./doc/suggestions";

export interface AlsoByEntry {
  title: string;
  subtitle: string;
}

/** Everything an exporter needs, already fetched. */
export interface ExportInput {
  book: Book;
  author: Author | null;
  chapters: Chapter[];
  alsoBy: AlsoByEntry[];
}

export interface BookElement {
  chapter: Chapter;
  kind: ElementKind;
  /** chapter number for numbered chapters, part number for parts */
  number: number | null;
  /** "Chapter One", "Part Two", "3" or "" */
  label: string;
  title: string;
  subtitle: string;
  section: Section;
  inToc: boolean;
  options: ChapterOptions;
  /** chapter image to show, if any (unset when hidden) */
  image: string | null;
}

const SECTION_ORDER: Record<Section, number> = { front: 0, body: 1, back: 2 };

export function sortChapters<T extends Pick<Chapter, "section" | "order">>(chapters: T[]): T[] {
  return [...chapters].sort((a, b) => SECTION_ORDER[a.section] - SECTION_ORDER[b.section] || a.order - b.order);
}

export function orderedElements(chapters: Chapter[], theme: InteriorTheme): BookElement[] {
  let chapterNo = 0;
  let partNo = 0;
  let volumeNo = 0;
  return sortChapters(chapters).map((c) => {
    const kind = elementKind(c.kind);
    let number: number | null = null;
    let label = "";
    if (c.kind === "part" && chapterOptions(c).volume) {
      // each book in a box set counts its own chapters and parts
      number = ++volumeNo;
      label = `Book ${capitalize(numberWord(number))}`;
      chapterNo = 0;
      partNo = 0;
    } else if (c.kind === "part") {
      number = ++partNo;
      label = `Part ${capitalize(numberWord(number))}`;
    } else if (c.kind === "chapter" && c.numbered) {
      number = ++chapterNo;
      label = chapterLabel(theme, number);
    }
    // pending tracked changes are not part of the book until accepted
    const content = withoutSuggestions(c.content);
    return {
      chapter: content === c.content ? c : { ...c, content },
      kind,
      number,
      label,
      title: c.title || kind.label,
      subtitle: c.subtitle || "",
      section: c.section,
      inToc: c.in_toc && !kind.smart,
      options: chapterOptions(c),
      image: chapterImage(c),
    };
  });
}

export function authorName(input: Pick<ExportInput, "author">): string {
  return input.author?.name || "Anonymous";
}

/** TOC entry text: "1. Title" style is avoided; the label is shown only for chapters. */
export function tocText(e: BookElement): string {
  if (e.kind.id === "part") return `${e.label}: ${e.title}`;
  return e.title;
}

export function chapterImage(c: Pick<Chapter, "options">): string | null {
  const o = chapterOptions(c);
  return o.image && !o.hideImage ? o.image : null;
}

/** Every image a set of chapters uses: manuscript images, chapter opening images and uploaded backgrounds. */
export function bookImages(chapters: Pick<Chapter, "content" | "options">[], format?: Pick<BookFormat, "pageBackground"> | null): string[] {
  const out = new Set<string>();
  const uploaded = (v: string | undefined) => !!v && v !== "none" && !isLibraryBackground(v);
  for (const c of chapters) {
    for (const src of collectImages(c.content)) out.add(src);
    const img = chapterImage(c);
    if (img) out.add(img);
    const bg = chapterOptions(c).background;
    if (uploaded(bg)) out.add(bg!);
  }
  if (uploaded(format?.pageBackground?.src)) out.add(format!.pageBackground!.src);
  return [...out];
}

export interface ResolvedBackground {
  /** "bg:<library id>" or an image URL */
  src: string;
  strength: number;
  /** only behind the element's first page (in ebooks: behind its heading) */
  openerOnly: boolean;
}

/**
 * The background behind one element: its own, else the book's, else the theme's opener background
 * on chapter-like sections. "none" on an element turns the others off.
 */
export function elementBackground(e: BookElement, format: Pick<BookFormat, "pageBackground">, theme: InteriorTheme): ResolvedBackground | null {
  const o = e.options;
  if (o.background === "none") return null;
  if (o.background) return { src: o.background, strength: clampStrength(o.backgroundStrength ?? 0.8), openerOnly: !!o.backgroundOpener };
  const pb = format.pageBackground;
  if (pb?.src) return { src: pb.src, strength: clampStrength(pb.strength), openerOnly: pb.where === "openers" };
  if (theme.openerBackground && !e.kind.smart && !e.kind.hideTitle && !e.kind.layout) return { src: `bg:${theme.openerBackground}`, strength: 0.75, openerOnly: true };
  return null;
}

function clampStrength(n: number | undefined): number {
  return Math.min(1, Math.max(0.1, Number(n) || 0.8));
}

/** Elements meant for this edition: ebook-only sections are left out of print and the other way round. */
export function forEdition(elements: BookElement[], edition: "ebook" | "print"): BookElement[] {
  return elements.filter((e) => !e.options.only || e.options.only === edition);
}
