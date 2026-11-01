import type { ExportInput } from "./book-model";
import type { DocNode } from "./doc/types";
import { DEFAULT_FORMAT, type Author, type Book, type Chapter } from "./types";

/**
 * A demo manuscript used by tests, the seed script and screenshots. It is clearly sample text and
 * is meant to be deleted once real books exist.
 */

const t = (text: string, marks?: string[]): DocNode => ({ type: "text", text, ...(marks ? { marks: marks.map((type) => ({ type })) } : {}) });
const p = (...content: DocNode[]): DocNode => ({ type: "paragraph", content });
const h = (level: number, text: string): DocNode => ({ type: "heading", attrs: { level }, content: [t(text)] });
const fn = (text: string): DocNode => ({ type: "footnote", attrs: { text } });
const doc = (...content: DocNode[]): DocNode => ({ type: "doc", content });

const LOREM = [
  "Every book begins as a promise to a particular reader. Before you outline a single chapter, write down who that reader is, what keeps them up at night and what they will be able to do when they close the book.",
  "Most first-time authors skip this step because it feels obvious. It never is. A clear reader turns a pile of ideas into an argument, and an argument is what makes a non-fiction book worth finishing.",
  "Think of the manuscript as a meal you are serving. Each chapter is a course, and each course should leave the reader ready for the next one rather than full and sleepy.",
  "The work is slower than you expect at the start and faster than you expect at the end. Protect the early weeks; that is when the shape of the book is decided.",
];

export function sampleChapters(): Omit<Chapter, "id" | "collectionId" | "book" | "owner" | "created" | "updated">[] {
  const base = { subtitle: "", status: "draft" as const, is_sample: false, in_toc: true, numbered: false, word_count: 0, options: null };
  return [
    { ...base, kind: "title_page", section: "front", order: 0, title: "Title page", content: null, in_toc: false },
    {
      ...base,
      kind: "copyright",
      section: "front",
      order: 1,
      title: "Copyright",
      in_toc: false,
      content: doc(p(t("Copyright © 2026 Tola Ekanem")), p(t("All rights reserved.")), p(t("Published by Jollof Pages")), p(t("First edition"))),
    },
    { ...base, kind: "dedication", section: "front", order: 2, title: "Dedication", in_toc: false, content: doc(p(t("For everyone who has a book in them."))) },
    { ...base, kind: "contents", section: "front", order: 3, title: "Contents", in_toc: false, content: null },
    {
      ...base,
      kind: "introduction",
      section: "front",
      order: 4,
      title: "Introduction",
      content: doc(p(t(LOREM[0])), p(t(LOREM[1])), p(t("This is "), t("sample text", ["italic"]), t(" to show how the Desk formats a book."), fn("Replace it with your own manuscript."))),
    },
    { ...base, kind: "part", section: "body", order: 0, title: "Preparing the pot", content: null },
    {
      ...base,
      kind: "chapter",
      section: "body",
      order: 1,
      numbered: true,
      is_sample: true,
      title: "Know your reader",
      subtitle: "The promise every book makes",
      content: doc(
        p(t(LOREM[0])),
        p(t(LOREM[1])),
        h(2, "Write the promise down"),
        p(t(LOREM[2])),
        { type: "bulletList", content: [1, 2, 3].map((n) => ({ type: "listItem", content: [p(t(["Who is the reader?", "What do they want?", "What stands in their way?"][n - 1]))] })) },
        { type: "callout", content: [p(t("Exercise: ", ["bold"]), t("Describe your reader in one paragraph without using the word \"everyone\"."))] },
        p(t(LOREM[3]), fn("A rule of thumb from many working authors, not a law.")),
        { type: "horizontalRule" },
        p(t(LOREM[2])),
        { type: "blockquote", content: [p(t("A book is a conversation with a reader you will never meet."))] },
        p(t(LOREM[1])),
      ),
    },
    {
      ...base,
      kind: "chapter",
      section: "body",
      order: 2,
      numbered: true,
      title: "Outline before you write",
      content: doc(p(t(LOREM[3])), h(2, "The three-act argument"), p(t(LOREM[0])), { type: "orderedList", attrs: { start: 1 }, content: ["Problem", "Turning point", "Method"].map((s) => ({ type: "listItem", content: [p(t(s))] })) }, p(t(LOREM[2])), h(3, "When the outline breaks"), p(t(LOREM[1]))),
    },
    { ...base, kind: "acknowledgments", section: "back", order: 0, title: "Acknowledgments", content: doc(p(t("Thank you to the readers of early drafts."))) },
    { ...base, kind: "about_author", section: "back", order: 1, title: "About the author", content: doc(p(t("Tola Ekanem writes practical books for first-time authors."))) },
  ];
}

export function sampleExportInput(): ExportInput {
  const book: Book = {
    id: "sample0000000001",
    collectionId: "books",
    owner: "u",
    title: "The Book Inside You",
    subtitle: "A practical guide to writing your first non-fiction book",
    slug: "the-book-inside-you",
    author: "a",
    series: "",
    series_number: 0,
    description: "A sample book that shows how Jollof Pages formats a manuscript.",
    pitch: "",
    keywords: [],
    categories: ["Writing", "Self-publishing"],
    language: "en",
    isbn_ebook: "",
    isbn_paperback: "",
    imprint: "Jollof Pages",
    publication_date: "",
    status: "drafting",
    published: false,
    featured: false,
    cover: "",
    cover_full: "",
    cover_design: null,
    format: { ...DEFAULT_FORMAT },
    goal: null,
    buy_links: [],
    praise: [],
    reviews: [],
    accent: "",
    word_count: 0,
    page_count: 0,
    created: "",
    updated: "",
  };
  const author: Author = { id: "a", collectionId: "authors", owner: "u", name: "Tola Ekanem", slug: "sample-author", bio: "", photo: "", website: "" };
  const chapters = sampleChapters().map((c, i) => ({ ...c, id: `c${i}`, collectionId: "chapters", book: book.id, owner: "u", created: "", updated: "" })) as Chapter[];
  return { book, author, chapters, alsoBy: [] };
}

const CHAPTER_TITLES = ["Find the spine of the argument", "Write the ugly first draft", "Make every chapter earn its place", "Research without drowning", "Editing in three passes", "Titles, subtitles and the promise", "Readers before launch", "Publishing is a craft too"];

/** Longer filler chapters so demo books have a realistic page count. Sample text only. */
export function fillerChapter(i: number): DocNode {
  const paras: DocNode[] = [];
  for (let k = 0; k < 6; k++) {
    paras.push(h(2, ["The problem", "What works", "An example", "Common mistakes", "Try this", "Before you move on"][k]));
    for (let j = 0; j < 16; j++) paras.push(p(t(LOREM[(i + j + k) % LOREM.length]), t(" " + LOREM[(i + j + k + 1) % LOREM.length])));
    if (k === 2) paras.push({ type: "callout", content: [p(t("Exercise: ", ["bold"]), t("Write one paragraph that applies this to your own book."))] });
  }
  return doc(...paras);
}

export function fillerTitle(i: number): string {
  return CHAPTER_TITLES[i % CHAPTER_TITLES.length];
}
