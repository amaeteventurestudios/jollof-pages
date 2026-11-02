/**
 * Headers and footers for the printed book: what the top of each left and right page says, where
 * the page number goes and how it looks. One setting drives the print PDF and both previews.
 *
 * Front matter never carries a running head. Each section can still hide its head or number,
 * or give a shorter title for the head (chapter options).
 */
import type { BookElement } from "./book-model";
import type { BookFormat } from "./types";

/** what a running head says */
export type HeadContent = "none" | "book" | "author" | "chapter" | "part";
export type FolioPlace = "bottom-center" | "bottom-outside" | "top-outside" | "none";

export interface RunningHeads {
  /** left-hand (even, verso) pages */
  left: HeadContent;
  /** right-hand (odd, recto) pages */
  right: HeadContent;
  /** heads toward the outside edge, or centred */
  align: "outside" | "center";
  folio: FolioPlace;
  /** 12, – 12 –, or Page 12 */
  folioStyle: "plain" | "dashes" | "word";
  /** how the head is set */
  style: "smallcaps" | "italic" | "plain";
  /** a hairline under the head */
  rule: boolean;
  /** a page number on chapter-opening pages */
  openerFolio: boolean;
}

export const DEFAULT_HEADS: RunningHeads = {
  left: "book",
  right: "chapter",
  align: "outside",
  folio: "bottom-center",
  folioStyle: "plain",
  style: "smallcaps",
  rule: false,
  openerFolio: true,
};

export const HEAD_CONTENT: [HeadContent, string][] = [
  ["book", "Book title"],
  ["author", "Author name"],
  ["chapter", "Chapter title"],
  ["part", "Part title"],
  ["none", "Nothing"],
];

export const FOLIO_PLACES: [FolioPlace, string][] = [
  ["bottom-center", "Bottom, centred"],
  ["bottom-outside", "Bottom, outside corner"],
  ["top-outside", "Top, outside corner"],
  ["none", "No page numbers"],
];

const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);

/** The book's header and footer settings, checked. With running heads switched off both heads say nothing. */
export function runningHeads(format: Partial<Pick<BookFormat, "runningHeads" | "heads">>): RunningHeads {
  const h = format.heads ?? {};
  const contents = ["none", "book", "author", "chapter", "part"] as const;
  const on = format.runningHeads !== false;
  return {
    left: on ? pick(h.left, contents, DEFAULT_HEADS.left) : "none",
    right: on ? pick(h.right, contents, DEFAULT_HEADS.right) : "none",
    align: pick(h.align, ["outside", "center"] as const, DEFAULT_HEADS.align),
    folio: pick(h.folio, ["bottom-center", "bottom-outside", "top-outside", "none"] as const, DEFAULT_HEADS.folio),
    folioStyle: pick(h.folioStyle, ["plain", "dashes", "word"] as const, DEFAULT_HEADS.folioStyle),
    style: pick(h.style, ["smallcaps", "italic", "plain"] as const, DEFAULT_HEADS.style),
    rule: typeof h.rule === "boolean" ? h.rule : DEFAULT_HEADS.rule,
    openerFolio: typeof h.openerFolio === "boolean" ? h.openerFolio : DEFAULT_HEADS.openerFolio,
  };
}

/** The title each element shows in a running head, and the part it sits in. */
export function headTitles(elements: BookElement[]): { title: string; part: string }[] {
  let part = "";
  return elements.map((e) => {
    if (e.kind.id === "part") part = e.chapter.title || e.title;
    else if (e.section !== "body") part = "";
    const own = e.options.runningTitle?.trim();
    return { title: own || e.chapter.title || e.title, part };
  });
}

export function folioText(n: string, style: RunningHeads["folioStyle"]): string {
  if (!n) return "";
  if (style === "dashes") return `– ${n} –`;
  if (style === "word") return `Page ${n}`;
  return n;
}

export interface PageChrome {
  head: string;
  headAlign: "left" | "right" | "center";
  folio: string;
  /** the number sits in the header line instead of the footer */
  folioTop: boolean;
  folioAlign: "left" | "right" | "center";
  style: RunningHeads["style"];
  rule: boolean;
}

/**
 * What a preview page shows above and below the text. `opener` is the first page of a section;
 * `folio` the page number as it should read (empty when none).
 */
export function pageChrome(
  h: RunningHeads,
  o: { recto: boolean; opener: boolean; front: boolean; hideHead?: boolean; hideFolio?: boolean; folio: string; book: string; author: string; title: string; part: string },
): PageChrome {
  const what = o.recto ? h.right : h.left;
  const text = { none: "", book: o.book, author: o.author, chapter: o.title, part: o.part }[what];
  const head = o.opener || o.front || o.hideHead ? "" : text;
  const outside = o.recto ? "right" : "left";
  const showFolio = h.folio !== "none" && !o.hideFolio && !(o.opener && !h.openerFolio) && !(o.opener && h.folio === "top-outside");
  return {
    head,
    headAlign: h.align === "center" || h.folio === "top-outside" ? (h.folio === "top-outside" && h.align === "outside" ? (o.recto ? "left" : "right") : "center") : outside,
    folio: showFolio ? folioText(o.folio, h.folioStyle) : "",
    folioTop: h.folio === "top-outside",
    folioAlign: h.folio === "bottom-center" ? "center" : outside,
    style: h.style,
    rule: h.rule,
  };
}
