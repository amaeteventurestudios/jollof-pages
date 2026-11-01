import { BLEED, SPINE_PER_PAGE, TRIM_SIZES, getTrim, type PaperType, type TrimSize } from "./kdp";

/**
 * "Refit my cover": a writer brings the full KDP paperback wrap they already have (back, spine and
 * front in one picture) made for an older page count or another printer. We work out where its
 * back, spine and front sit, cut out the two panels, and the Desk rebuilds the wrap around the
 * spine this book needs now. The spine is redrawn in the old spine's colour with the title on it.
 */

export interface PxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WrapReading {
  trim: TrimSize;
  /** whether the picture carries KDP's 0.125 in bleed round the outside */
  bleed: boolean;
  dpi: number;
  /** the old spine width in inches, and roughly how many pages that was on this paper */
  spine: number;
  pages: number;
  /** pixel areas to cut: each panel keeps its outer bleed */
  back: PxRect;
  spineRect: PxRect;
  front: PxRect;
  notes: string[];
}

const MAX_SPINE = 1.6;

function readAs(img: { width: number; height: number }, trim: TrimSize, bleed: boolean, paper: PaperType): WrapReading | null {
  const e = bleed ? BLEED : 0;
  const dpi = img.height / (trim.height + 2 * e);
  const widthIn = img.width / dpi;
  const spine = widthIn - 2 * trim.width - 2 * e;
  // a hair under zero is rounding; a full wrap can't be narrower than two panels
  if (spine < -0.03 || spine > MAX_SPINE) return null;
  const s = Math.max(0, spine);
  const panel = Math.round((e + trim.width) * dpi);
  const spinePx = Math.max(0, img.width - 2 * panel);
  const notes: string[] = [];
  if (!bleed)
    notes.push("This picture has no bleed round the edge. KDP needs 0.125 in, so the Desk stretches the art very slightly to cover it. Check that nothing important sits right at the edges.");
  if (dpi < 290) notes.push(`It is ${Math.round(dpi)} dpi. KDP asks for 300, so print may look soft. A larger original gives a sharper book.`);
  return {
    trim,
    bleed,
    dpi,
    spine: s,
    pages: Math.round(s / SPINE_PER_PAGE[paper]),
    back: { x: 0, y: 0, width: panel, height: img.height },
    spineRect: { x: panel, y: 0, width: spinePx, height: img.height },
    front: { x: panel + spinePx, y: 0, width: img.width - panel - spinePx, height: img.height },
    notes,
  };
}

/** How far a dpi is from the round numbers covers are made at, as a fraction. */
function offRound(dpi: number): number {
  return Math.min(...[300, 350, 400, 450, 600].map((d) => Math.abs(dpi - d) / d));
}

/**
 * Reads a full wrap. Tries every KDP trim, with and without bleed, and keeps the reading that lands
 * on a round dpi (covers are made at 300), preferring the book's own trim and bleed when it is as
 * good. null when the picture is not a wrap at all (a front cover on its own, say).
 */
export function readWrap(img: { width: number; height: number }, trimId: string | undefined, paper: PaperType = "white"): WrapReading | null {
  if (!img.width || !img.height || img.width < img.height) return null;
  const own = getTrim(trimId);
  const all: { r: WrapReading; score: number }[] = [];
  for (const t of [own, ...TRIM_SIZES.filter((t) => t.id !== own.id)])
    for (const bleed of [true, false]) {
      const r = readAs(img, t, bleed, paper);
      // small penalties keep the writer's own trim, and bleed, when the fit is just as close
      if (r) all.push({ r, score: offRound(r.dpi) + (t.id === own.id ? 0 : 0.004) + (bleed ? 0 : 0.002) });
    }
  if (!all.length) return null;
  const best = all.reduce((a, b) => (b.score < a.score ? b : a)).r;
  if (best.trim.id !== own.id)
    best.notes.unshift(`This cover looks like it was made for ${best.trim.label}, not ${own.label}. The panels will be resized to your trim, so a little of the edges may be cropped.`);
  return best;
}

/** A readable spine text colour on a background colour. */
export function inkOn(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1c1a17" : "#ffffff";
}

export const toHex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
