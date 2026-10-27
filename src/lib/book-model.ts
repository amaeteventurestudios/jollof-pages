import { elementKind, type ElementKind } from "./elements";
import { capitalize, chapterLabel, numberWord, type InteriorTheme } from "./themes";
import type { Author, Book, Chapter, Section } from "./types";

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
}

const SECTION_ORDER: Record<Section, number> = { front: 0, body: 1, back: 2 };

export function sortChapters<T extends Pick<Chapter, "section" | "order">>(chapters: T[]): T[] {
  return [...chapters].sort((a, b) => SECTION_ORDER[a.section] - SECTION_ORDER[b.section] || a.order - b.order);
}

export function orderedElements(chapters: Chapter[], theme: InteriorTheme): BookElement[] {
  let chapterNo = 0;
  let partNo = 0;
  return sortChapters(chapters).map((c) => {
    const kind = elementKind(c.kind);
    let number: number | null = null;
    let label = "";
    if (c.kind === "part") {
      number = ++partNo;
      label = `Part ${capitalize(numberWord(number))}`;
    } else if (c.kind === "chapter" && c.numbered) {
      number = ++chapterNo;
      label = chapterLabel(theme, number);
    }
    return {
      chapter: c,
      kind,
      number,
      label,
      title: c.title || kind.label,
      subtitle: c.subtitle || "",
      section: c.section,
      inToc: c.in_toc && !kind.smart,
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
