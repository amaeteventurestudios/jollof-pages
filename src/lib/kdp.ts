/**
 * Amazon KDP print rules: trim sizes, margins, bleed, spine width and full-wrap cover size.
 *
 * Numbers follow KDP's paperback guidance (kdp.amazon.com "Set Trim Size, Bleed, and Margins"
 * and "Create a Paperback Cover"). All lengths are inches.
 */

export type PaperType = "white" | "cream" | "color-standard" | "color-premium";

export interface TrimSize {
  id: string;
  label: string;
  width: number;
  height: number;
  /** rough words per page at 11pt body, used only until a real PDF has been built */
  wordsPerPage: number;
  /** true for sizes larger than 6.12 x 9 in, which KDP caps at fewer pages */
  large: boolean;
}

export const TRIM_SIZES: TrimSize[] = [
  { id: "5x8", label: '5" x 8"', width: 5, height: 8, wordsPerPage: 250, large: false },
  { id: "5.25x8", label: '5.25" x 8"', width: 5.25, height: 8, wordsPerPage: 270, large: false },
  { id: "5.5x8.5", label: '5.5" x 8.5"', width: 5.5, height: 8.5, wordsPerPage: 300, large: false },
  { id: "6x9", label: '6" x 9"', width: 6, height: 9, wordsPerPage: 350, large: false },
  { id: "6.14x9.21", label: '6.14" x 9.21"', width: 6.14, height: 9.21, wordsPerPage: 360, large: true },
  { id: "7x10", label: '7" x 10"', width: 7, height: 10, wordsPerPage: 430, large: true },
  { id: "8.5x11", label: '8.5" x 11"', width: 8.5, height: 11, wordsPerPage: 550, large: true },
];

export const DEFAULT_TRIM = "6x9";

export function getTrim(id: string | undefined): TrimSize {
  return TRIM_SIZES.find((t) => t.id === id) ?? TRIM_SIZES.find((t) => t.id === DEFAULT_TRIM)!;
}

export const BLEED = 0.125;
export const MIN_PAGES = 24;

/** inches of spine per page, by paper */
export const SPINE_PER_PAGE: Record<PaperType, number> = {
  white: 0.002252,
  cream: 0.0025,
  "color-standard": 0.002252,
  "color-premium": 0.002347,
};

export const PAPER_LABELS: Record<PaperType, string> = {
  white: "Black ink, white paper",
  cream: "Black ink, cream paper",
  "color-standard": "Standard color, white paper",
  "color-premium": "Premium color, white paper",
};

/** KDP's minimum inside (gutter) margin, which grows with page count. */
export function minGutter(pageCount: number): number {
  if (pageCount <= 150) return 0.375;
  if (pageCount <= 300) return 0.5;
  if (pageCount <= 500) return 0.625;
  if (pageCount <= 700) return 0.75;
  return 0.875;
}

/** KDP's minimum outside/top/bottom margin. */
export function minOutside(bleed: boolean): number {
  return bleed ? 0.375 : 0.25;
}

export function maxPages(trim: TrimSize, paper: PaperType): number {
  if (paper === "color-standard") return 600;
  if (paper === "color-premium") return trim.large ? 590 : 828;
  if (paper === "cream") return trim.large ? 550 : 776;
  return trim.large ? 590 : 828;
}

export interface Margins {
  inside: number;
  outside: number;
  top: number;
  bottom: number;
}

export interface PageGeometry {
  trim: TrimSize;
  bleed: boolean;
  /** page size including bleed when bleed is on */
  pageWidth: number;
  pageHeight: number;
  /** margins measured from the page edge (bleed included) */
  margins: Margins;
  /** KDP minimums for this page count, for display */
  minimums: Margins;
}

/**
 * Comfortable reading margins that always clear KDP's minimums. The gutter is KDP's minimum plus
 * a quarter inch, so text never disappears into the binding as the book grows.
 */
export function pageGeometry(trimId: string | undefined, pageCount: number, bleed: boolean): PageGeometry {
  const trim = getTrim(trimId);
  const big = trim.width >= 7;
  const outsideBase = big ? 0.75 : 0.6;
  const vBase = big ? 0.8 : 0.7;
  const bleedAdd = bleed ? BLEED : 0;
  const gutter = minGutter(pageCount);
  const minOut = minOutside(bleed);
  const margins: Margins = {
    inside: round(gutter + 0.25),
    outside: round(Math.max(outsideBase, minOut) + bleedAdd),
    top: round(Math.max(vBase, minOut) + bleedAdd),
    bottom: round(Math.max(vBase + 0.05, minOut) + bleedAdd),
  };
  return {
    trim,
    bleed,
    pageWidth: round(trim.width + bleedAdd),
    pageHeight: round(trim.height + 2 * bleedAdd),
    margins,
    minimums: { inside: gutter, outside: minOut + bleedAdd, top: minOut + bleedAdd, bottom: minOut + bleedAdd },
  };
}

export function spineWidth(pageCount: number, paper: PaperType): number {
  return round(Math.max(pageCount, 0) * SPINE_PER_PAGE[paper], 4);
}

export interface CoverGeometry {
  trim: TrimSize;
  pageCount: number;
  paper: PaperType;
  spine: number;
  /** full wrap including bleed on all four sides */
  width: number;
  height: number;
  /** x offsets (inches from the left edge) of the panels */
  backX: number;
  spineX: number;
  frontX: number;
  /** KDP only allows spine text above 79 pages */
  spineTextAllowed: boolean;
  /** margin to keep text inside the trim line */
  safe: number;
  /** KDP places its barcode in a 2 x 1.2 in box on the back cover */
  barcode: { x: number; y: number; width: number; height: number };
}

export function coverGeometry(trimId: string | undefined, pageCount: number, paper: PaperType): CoverGeometry {
  const trim = getTrim(trimId);
  const spine = spineWidth(pageCount, paper);
  const width = round(BLEED + trim.width + spine + trim.width + BLEED, 4);
  const height = round(BLEED + trim.height + BLEED, 4);
  const backX = BLEED;
  const spineX = round(BLEED + trim.width, 4);
  const frontX = round(spineX + spine, 4);
  return {
    trim,
    pageCount,
    paper,
    spine,
    width,
    height,
    backX,
    spineX,
    frontX,
    spineTextAllowed: pageCount >= 79,
    safe: 0.125,
    barcode: { x: round(spineX - 0.25 - 2, 4), y: round(height - BLEED - 0.25 - 1.2, 4), width: 2, height: 1.2 },
  };
}

/** Pages a manuscript will roughly fill, before a real PDF exists. */
export function estimatePages(words: number, trimId: string | undefined, sections: number, fontSize = 11): number {
  const trim = getTrim(trimId);
  const scale = (11 / fontSize) ** 2;
  const body = Math.ceil(words / (trim.wordsPerPage * scale));
  // each element opens on a new page and usually leaves part of a page blank
  const pages = body + Math.ceil(sections * 1.5) + 4;
  return Math.max(MIN_PAGES, pages + (pages % 2));
}

function round(n: number, places = 3): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

export function inches(n: number, places = 3): string {
  return `${Number(n.toFixed(places))}"`;
}
