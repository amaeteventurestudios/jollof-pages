/**
 * Amazon KDP print rules: trim sizes, margins, bleed, spine width and full-wrap cover size, for
 * paperbacks and case laminate hardcovers.
 *
 * Numbers follow KDP's guidance (kdp.amazon.com "Set Trim Size, Bleed, and Margins", "Create a
 * Paperback Cover" and "Create a Hardcover Cover"). All lengths are inches.
 */

export type PaperType = "white" | "cream" | "color-standard" | "color-premium";
export type Binding = "paperback" | "hardcover";

export interface TrimSize {
  id: string;
  label: string;
  width: number;
  height: number;
  /** rough words per page at 11pt body, used only until a real PDF has been built */
  wordsPerPage: number;
  /** true for sizes larger than 6.12 x 9 in, which KDP caps at fewer pages */
  large: boolean;
  /** KDP also prints this size as a case laminate hardcover */
  hardcover: boolean;
}

export const TRIM_SIZES: TrimSize[] = [
  { id: "5x8", label: '5" x 8"', width: 5, height: 8, wordsPerPage: 250, large: false, hardcover: false },
  { id: "5.25x8", label: '5.25" x 8"', width: 5.25, height: 8, wordsPerPage: 270, large: false, hardcover: false },
  { id: "5.5x8.5", label: '5.5" x 8.5"', width: 5.5, height: 8.5, wordsPerPage: 300, large: false, hardcover: true },
  { id: "6x9", label: '6" x 9"', width: 6, height: 9, wordsPerPage: 350, large: false, hardcover: true },
  { id: "6.14x9.21", label: '6.14" x 9.21"', width: 6.14, height: 9.21, wordsPerPage: 360, large: true, hardcover: true },
  { id: "7x10", label: '7" x 10"', width: 7, height: 10, wordsPerPage: 430, large: true, hardcover: true },
  { id: "8.25x11", label: '8.25" x 11"', width: 8.25, height: 11, wordsPerPage: 535, large: true, hardcover: true },
  { id: "8.5x11", label: '8.5" x 11"', width: 8.5, height: 11, wordsPerPage: 550, large: true, hardcover: false },
];

export const HARDCOVER_TRIMS = TRIM_SIZES.filter((t) => t.hardcover);

export const DEFAULT_TRIM = "6x9";

export function getTrim(id: string | undefined): TrimSize {
  return TRIM_SIZES.find((t) => t.id === id) ?? TRIM_SIZES.find((t) => t.id === DEFAULT_TRIM)!;
}

/** The hardcover size for a trim: the same size when KDP binds it in hardcover, else the nearest one it does. */
export function hardcoverTrim(id: string | undefined): TrimSize {
  const t = getTrim(id);
  if (t.hardcover) return t;
  return HARDCOVER_TRIMS.reduce((best, c) => (Math.abs(c.width * c.height - t.width * t.height) < Math.abs(best.width * best.height - t.width * t.height) ? c : best));
}

export const BLEED = 0.125;
export const MIN_PAGES = 24;

/**
 * Case laminate hardcover. The printed cover wraps round 0.189 in boards: 0.591 in (15 mm) of it
 * folds inside on every outer edge, each board is 0.197 in wider and 0.236 in taller than the
 * trim, and KDP keeps text 0.4 in (10 mm) clear of the spine hinge. 75 to 550 pages on every paper.
 */
export const HARDCOVER = {
  wrap: 0.591,
  boardExtraWidth: 0.197,
  boardExtraHeight: 0.236,
  boardThickness: 0.189,
  hinge: 0.4,
  minPages: 75,
  maxPages: 550,
  /** extra gutter on top of KDP's minimum: a case-bound book does not open as flat as a paperback */
  extraGutter: 0.125,
};

export function minPages(binding: Binding = "paperback"): number {
  return binding === "hardcover" ? HARDCOVER.minPages : MIN_PAGES;
}

/** KDP binds black ink hardcovers on white or cream, and colour only as premium colour. */
export function hardcoverPaper(paper: PaperType): PaperType {
  return paper === "color-standard" ? "color-premium" : paper;
}

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

export function maxPages(trim: TrimSize, paper: PaperType, binding: Binding = "paperback"): number {
  if (binding === "hardcover") return HARDCOVER.maxPages;
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
  binding: Binding;
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
export function pageGeometry(trimId: string | undefined, pageCount: number, bleed: boolean, binding: Binding = "paperback"): PageGeometry {
  const trim = getTrim(trimId);
  const big = trim.width >= 7;
  const outsideBase = big ? 0.75 : 0.6;
  const vBase = big ? 0.8 : 0.7;
  const bleedAdd = bleed ? BLEED : 0;
  const gutter = minGutter(pageCount);
  const minOut = minOutside(bleed);
  const margins: Margins = {
    inside: round(gutter + 0.25 + (binding === "hardcover" ? HARDCOVER.extraGutter : 0)),
    outside: round(Math.max(outsideBase, minOut) + bleedAdd),
    top: round(Math.max(vBase, minOut) + bleedAdd),
    bottom: round(Math.max(vBase + 0.05, minOut) + bleedAdd),
  };
  return {
    trim,
    binding,
    bleed,
    pageWidth: round(trim.width + bleedAdd),
    pageHeight: round(trim.height + 2 * bleedAdd),
    margins,
    minimums: { inside: gutter, outside: minOut + bleedAdd, top: minOut + bleedAdd, bottom: minOut + bleedAdd },
  };
}

export function spineWidth(pageCount: number, paper: PaperType, binding: Binding = "paperback"): number {
  const board = binding === "hardcover" ? HARDCOVER.boardThickness : 0;
  return round(Math.max(pageCount, 0) * SPINE_PER_PAGE[paper] + board, 4);
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CoverGeometry {
  binding: Binding;
  trim: TrimSize;
  pageCount: number;
  paper: PaperType;
  spine: number;
  /** what runs past the finished edge on the three outer sides: bleed on a paperback, the turn-in on a hardcover */
  edge: number;
  /** the finished back or front panel: the trim on a paperback, the board on a hardcover */
  panelWidth: number;
  panelHeight: number;
  /** the whole printed sheet */
  width: number;
  height: number;
  /** x offsets (inches from the left edge) of the panels */
  backX: number;
  spineX: number;
  frontX: number;
  /** KDP only allows paperback spine text from 79 pages */
  spineTextAllowed: boolean;
  /** margin to keep text inside the finished edge */
  safe: number;
  /** where words and faces are safe on each panel */
  safeBack: Rect;
  safeFront: Rect;
  /** KDP places its barcode in a 2 x 1.2 in box on the back cover */
  barcode: Rect;
}

export function coverGeometry(trimId: string | undefined, pageCount: number, paper: PaperType, binding: Binding = "paperback"): CoverGeometry {
  const hard = binding === "hardcover";
  const trim = hard ? hardcoverTrim(trimId) : getTrim(trimId);
  const spine = spineWidth(pageCount, paper, binding);
  const edge = hard ? HARDCOVER.wrap : BLEED;
  const panelWidth = round(trim.width + (hard ? HARDCOVER.boardExtraWidth : 0), 4);
  const panelHeight = round(trim.height + (hard ? HARDCOVER.boardExtraHeight : 0), 4);
  const width = round(edge + panelWidth + spine + panelWidth + edge, 4);
  const height = round(edge + panelHeight + edge, 4);
  const backX = edge;
  const spineX = round(edge + panelWidth, 4);
  const frontX = round(spineX + spine, 4);
  // a hardcover board's outer edge rounds over and its spine side bends at the hinge
  const safe = hard ? 0.375 : 0.125;
  const hinge = hard ? HARDCOVER.hinge : safe;
  const safeH = round(panelHeight - 2 * safe, 4);
  const safeW = round(panelWidth - safe - hinge, 4);
  const barcodeBottom = hard ? 0.76 : 0.25;
  const barcodeSide = hard ? HARDCOVER.hinge + 0.25 : 0.25;
  return {
    binding,
    trim,
    pageCount,
    paper,
    spine,
    edge,
    panelWidth,
    panelHeight,
    width,
    height,
    backX,
    spineX,
    frontX,
    spineTextAllowed: hard || pageCount >= 79,
    safe,
    safeBack: { x: round(edge + safe, 4), y: round(edge + safe, 4), width: safeW, height: safeH },
    safeFront: { x: round(frontX + hinge, 4), y: round(edge + safe, 4), width: safeW, height: safeH },
    barcode: { x: round(spineX - barcodeSide - 2, 4), y: round(height - edge - barcodeBottom - 1.2, 4), width: 2, height: 1.2 },
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
