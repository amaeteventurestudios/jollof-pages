import { elementKind, type ElementKind } from "./elements";
import { capitalize, chapterLabel, numberWord, type InteriorTheme } from "./themes";
import { chapterOptions, type Author, type Book, type Chapter, type ChapterOptions, type Section } from "./types";
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

/** Every image a set of chapters uses: manuscript images plus chapter opening images. */
export function bookImages(chapters: Pick<Chapter, "content" | "options">[]): string[] {
  const out = new Set<string>();
  for (const c of chapters) {
    for (const src of collectImages(c.content)) out.add(src);
    const img = chapterImage(c);
    if (img) out.add(img);
  }
  return [...out];
}
