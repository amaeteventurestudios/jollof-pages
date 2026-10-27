import { BLEED, MIN_PAGES, maxPages, type CoverGeometry } from "./kdp";

/** KDP asks for cover images at 300 dpi. */
export const DPI = 300;
const LOW_DPI = 200;

/** Aspect ratios that ChatGPT and Gemini (Nano Banana) can be asked for, portrait. */
const RATIOS: [string, number][] = [
  ["2:3", 2 / 3],
  ["3:4", 3 / 4],
  ["4:5", 4 / 5],
  ["9:16", 9 / 16],
];

export interface ArtSize {
  /** inches, bleed included */
  width: number;
  height: number;
  /** pixels at 300 dpi */
  px: { width: number; height: number };
  /** the nearest ratio an image tool offers, and how much of the picture the studio crops to fit */
  ratio: string;
  cropPercent: number;
  /** how much of each edge to keep free of faces, text and key detail (bleed plus safe margin) */
  edgePercent: number;
}

export interface ArtSpec {
  front: ArtSize;
  back: ArtSize;
  wrap: { width: number; height: number; px: { width: number; height: number } };
  spine: { width: number; px: number };
}

const px = (inches: number) => Math.ceil(inches * DPI);

function artSize(width: number, height: number, safe: number): ArtSize {
  const r = width / height;
  const [ratio, rv] = RATIOS.reduce((best, cur) => (Math.abs(cur[1] - r) < Math.abs(best[1] - r) ? cur : best));
  return {
    width,
    height,
    px: { width: px(width), height: px(height) },
    ratio,
    cropPercent: Math.round((1 - Math.min(rv, r) / Math.max(rv, r)) * 100),
    edgePercent: Math.ceil(((BLEED + safe) / width) * 100),
  };
}

/** Exact artwork sizes for this book: the front and back panels each carry the bleed on their three outer edges. */
export function artSpec(g: CoverGeometry): ArtSpec {
  const panelW = g.trim.width + BLEED;
  const panelH = g.trim.height + 2 * BLEED;
  return {
    front: artSize(panelW, panelH, g.safe),
    back: artSize(panelW, panelH, g.safe),
    wrap: { width: g.width, height: g.height, px: { width: px(g.width), height: px(g.height) } },
    spine: { width: g.spine, px: px(g.spine) },
  };
}

/** The resolution an image prints at when it is cropped to fill an area, like object-fit: cover. */
export function effectiveDpi(img: { width: number; height: number }, area: { width: number; height: number }): number {
  return Math.floor(Math.min(img.width / area.width, img.height / area.height));
}

export type CheckState = "ok" | "warn" | "fail";
export interface Check {
  state: CheckState;
  label: string;
  detail: string;
}

export interface PreflightInput {
  g: CoverGeometry;
  pagesEstimated: boolean;
  front: { width: number; height: number } | null;
  back: { width: number; height: number } | null;
  frontText: boolean;
  title: { x: number; y: number };
  author: { x: number; y: number };
  centered: boolean;
  blurb: boolean;
  description: string;
}

function imageCheck(label: string, img: { width: number; height: number } | null, size: ArtSize, required: boolean): Check | null {
  if (!img) return required ? { state: "warn", label, detail: "No artwork yet. The panel prints in the flat colour you picked." } : null;
  const dpi = effectiveDpi(img, size);
  const need = `${size.px.width} x ${size.px.height} px`;
  if (dpi >= DPI) return { state: "ok", label, detail: `${img.width} x ${img.height} px prints at ${dpi} dpi.` };
  if (dpi >= LOW_DPI) return { state: "warn", label, detail: `${img.width} x ${img.height} px prints at ${dpi} dpi. KDP asks for 300; aim for ${need}. Upscale it before you publish.` };
  return { state: "fail", label, detail: `${img.width} x ${img.height} px prints at only ${dpi} dpi and will look soft. You need ${need}. Upscale it or make it at a larger size.` };
}

/** What KDP checks on a paperback cover, judged before the PDF is made. */
export function preflight(p: PreflightInput): Check[] {
  const { g } = p;
  const spec = artSpec(g);
  const checks: Check[] = [];

  if (p.pagesEstimated) {
    checks.push({
      state: "fail",
      label: "Page count",
      detail: `${g.pageCount} pages is an estimate. The spine width depends on it, and KDP rejects a cover whose spine does not match the interior. Enter the real page count of your interior PDF on the Format tab.`,
    });
  } else if (g.pageCount < MIN_PAGES || g.pageCount > maxPages(g.trim, g.paper)) {
    checks.push({ state: "fail", label: "Page count", detail: `KDP prints paperbacks of ${MIN_PAGES} to ${maxPages(g.trim, g.paper)} pages on this paper; this book has ${g.pageCount}.` });
  } else {
    checks.push({ state: "ok", label: "Page count", detail: `${g.pageCount} pages gives a ${g.spine.toFixed(4)} in spine.` });
  }

  checks.push({ state: "ok", label: "PDF size", detail: `${g.width.toFixed(3)} x ${g.height.toFixed(3)} in, one page, bleed on all four sides, exported at 300 dpi.` });

  checks.push(
    g.spineTextAllowed
      ? { state: "ok", label: "Spine text", detail: "Title and author are set on the spine." }
      : { state: "ok", label: "Spine text", detail: `Left blank: KDP allows spine text from 79 pages, this book has ${g.pageCount}.` },
  );

  for (const c of [imageCheck("Front artwork", p.front, spec.front, true), imageCheck("Back artwork", p.back, spec.back, false)]) if (c) checks.push(c);

  if (p.frontText) {
    // positions are fractions of the front panel, which runs from the spine fold to the outer bleed
    const left = g.safe / spec.front.width;
    const right = (g.trim.width - g.safe) / spec.front.width;
    const top = (BLEED + g.safe) / spec.front.height;
    const bottom = (BLEED + g.trim.height - g.safe - 0.35) / spec.front.height;
    const out = (["title", "author"] as const).filter((k) => {
      const pos = p[k];
      const w = p.centered ? 0.37 : 0;
      return pos.x - w < left || pos.x + w > right || pos.y < top || pos.y > bottom;
    });
    checks.push(
      out.length
        ? { state: "fail", label: "Safe area", detail: `The ${out.join(" and ")} sits outside the blue safe line and may be trimmed off. Drag it inside.` }
        : { state: "ok", label: "Safe area", detail: "Title and author sit inside the safe line, at least 0.125 in from the trim." },
    );
  } else {
    checks.push({ state: "warn", label: "Safe area", detail: "Your artwork carries its own lettering. Check with the guides on that every word is inside the blue safe line." });
  }

  if (p.blurb && !p.description.trim()) checks.push({ state: "warn", label: "Back cover text", detail: "There is no description yet. Add it on the Book details tab, or turn the back text off." });
  checks.push({
    state: p.back ? "warn" : "ok",
    label: "Barcode",
    detail: p.back
      ? "KDP prints a white barcode box over the bottom right of the back cover. Keep nothing important under the red box."
      : "The bottom right of the back cover is left clear for KDP's barcode.",
  });
  return checks;
}

/** Ready-to-paste instructions for an image tool. */
export function artPrompts(spec: ArtSpec, book: { title: string; subtitle?: string; author: string }, withLettering: boolean) {
  const edge = spec.front.edgePercent + 1;
  const common = `Flat full-bleed artwork only: no border, no frame, no mockup, no 3D book, no shadow around it. Portrait, ${spec.front.ratio} aspect ratio, as large as you can make it. Keep faces, words and important detail at least ${edge}% in from every edge, because the printer trims there.`;
  const front = withLettering
    ? `Design the front cover of a non-fiction book. Title: "${book.title}".${book.subtitle ? ` Subtitle: "${book.subtitle}".` : ""} Author: "${book.author}". Set the title large and readable, spelled exactly as given. ${common}`
    : `Create the artwork for the front cover of a non-fiction book called "${book.title}". Do not include any text, letters or numbers: the title is added later. Leave calm space in the top third for the title. ${common}`;
  const back = `Create the matching back cover artwork for the same book, in the same style and colours as the front. Keep it quiet and low in detail, because a paragraph of text sits on top of it. Leave the bottom-right corner plain: a barcode goes there. No text, letters or numbers. ${common}`;
  return { front, back };
}
