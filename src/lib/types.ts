import { hardcoverPaper, hardcoverTrim, type Binding, type PaperType } from "./kdp";
import type { DocNode } from "./doc/types";

export type BookStatus = "idea" | "drafting" | "revising" | "editing" | "ready" | "published";

export const BOOK_STATUSES: { id: BookStatus; label: string }[] = [
  { id: "idea", label: "Idea" },
  { id: "drafting", label: "Drafting" },
  { id: "revising", label: "Revising" },
  { id: "editing", label: "Editing" },
  { id: "ready", label: "Ready to publish" },
  { id: "published", label: "Published" },
];

export type Section = "front" | "body" | "back";

export interface BookFormat {
  trim: string;
  paper: PaperType;
  theme: string;
  fontSize: number;
  lineHeight: number;
  bleed: boolean;
  /** start every chapter on a right-hand page in print */
  chaptersOnRight: boolean;
  dropCaps: boolean;
  /** show a running header with author and chapter title in print */
  runningHeads: boolean;
  /** print the table of contents at the front */
  printToc: boolean;
  /** large-print edition: 16pt body, wider leading */
  largePrint: boolean;
  /** also publish a case laminate hardcover edition */
  hardcover: boolean;
  /** hardcover trim; empty means the paperback trim, or the nearest hardcover size to it */
  hardcoverTrim: string;
}

export const DEFAULT_FORMAT: BookFormat = {
  trim: "6x9",
  paper: "cream",
  theme: "accra",
  fontSize: 11,
  lineHeight: 1.45,
  bleed: false,
  chaptersOnRight: true,
  dropCaps: true,
  runningHeads: true,
  printToc: true,
  largePrint: false,
  hardcover: false,
  hardcoverTrim: "",
};

export interface BookGoal {
  targetWords: number;
  deadline: string; // YYYY-MM-DD, may be empty
  dailyWords: number; // habit goal
}

export const DEFAULT_GOAL: BookGoal = { targetWords: 50000, deadline: "", dailyWords: 500 };

export interface BuyLink {
  label: string;
  url: string;
  price?: string; // shown on the button, e.g. "$18"
}

/** A quotation on a book's page: praise from a person, or a review from a publication. */
export interface Quote {
  quote: string;
  source: string; // person or publication
  role?: string; // e.g. "author of The Long Table"
  url?: string;
}

export interface Book {
  id: string;
  collectionId: string;
  owner: string;
  title: string;
  subtitle: string;
  slug: string;
  author: string; // relation to authors
  series: string;
  series_number: number;
  description: string; // blurb (plain text paragraphs)
  pitch: string; // one-line hook for the site
  keywords: string[] | null;
  categories: string[] | null;
  language: string;
  isbn_ebook: string;
  isbn_paperback: string;
  isbn_hardcover?: string;
  imprint: string;
  publication_date: string;
  status: BookStatus;
  published: boolean;
  featured: boolean;
  cover: string;
  cover_full: string;
  cover_design: unknown;
  format: Partial<BookFormat> | null;
  goal: Partial<BookGoal> | null;
  buy_links: BuyLink[] | null;
  praise: Quote[] | null;
  reviews: Quote[] | null;
  accent: string;
  word_count: number;
  page_count: number;
  /** pages in the hardcover interior, which has its own trim and a wider gutter */
  hardcover_page_count?: number;
  cover_hardcover?: string;
  /** sold straight from the author's site, paid into their own Stripe account (Pro) */
  sell_direct?: boolean;
  ebook_price_cents?: number;
  ebook_file?: string;
  created: string;
  updated: string;
  expand?: { author?: Author };
}

export interface Chapter {
  id: string;
  collectionId: string;
  book: string;
  owner: string;
  title: string;
  subtitle: string;
  kind: string;
  section: Section;
  order: number;
  content: DocNode | null;
  word_count: number;
  status: "draft" | "revised" | "final";
  is_sample: boolean;
  in_toc: boolean;
  numbered: boolean;
  created: string;
  updated: string;
}

export interface Author {
  id: string;
  collectionId: string;
  owner: string;
  name: string;
  slug: string;
  bio: string;
  photo: string;
  website: string;
}

export interface WritingLog {
  id: string;
  owner: string;
  book: string;
  date: string;
  words: number;
}

export interface SiteSettings {
  id: string;
  collectionId: string;
  owner: string;
  publisher_name: string;
  tagline: string;
  intro: string;
  about: string;
  email: string;
  logo: string;
  socials: { label: string; url: string }[] | null;
  hero_book: string;
  /** <subdomain>.jollofpages.com; empty for the publisher's own site */
  subdomain?: string;
  /** the site served at the root domain (jollofpages.com) */
  home?: boolean;
  custom_domain?: string;
  /** Author Site Pro is active until this date (own domain); the publisher's home site always has it */
  pro_until?: string;
  design?: import("./site-design").SiteDesign | null;
}

export function bookFormat(b: Pick<Book, "format">): BookFormat {
  return { ...DEFAULT_FORMAT, ...(b.format ?? {}) };
}

/** The trim and paper of one print edition. */
export function printEdition(f: BookFormat, binding: Binding): { trim: string; paper: PaperType } {
  if (binding === "paperback") return { trim: f.trim, paper: f.paper };
  return { trim: hardcoverTrim(f.hardcoverTrim || f.trim).id, paper: hardcoverPaper(f.paper) };
}

export function bookGoal(b: Pick<Book, "goal">): BookGoal {
  return { ...DEFAULT_GOAL, ...(b.goal ?? {}) };
}
