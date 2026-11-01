/**
 * How an author site looks: five colours, a font pair and a pattern. Colours are made from the
 * author's own book covers, then nudged until every pairing the site uses stays readable
 * (cream type on the hero, dark type on the accent, and so on). Shared by the Desk and the site.
 */
import type { PatternKind } from "@/components/site/patterns";

export interface SitePalette {
  /** hero and section colour, under cream type */
  hero: string;
  /** deepest shade: footer, reader-list band, dark type */
  deep: string;
  /** buttons and highlights, under deep type */
  accent: string;
  /** page background (light mode) */
  light: string;
}

export interface SiteDesign {
  palette?: SitePalette;
  /** a FONT_PAIRS id */
  fonts?: string;
  pattern?: PatternKind | "none";
  /** a TEMPLATES id: how the home page is laid out */
  template?: TemplateId;
  /** a short name for the chosen look, shown in the Desk */
  label?: string;
}

// ---------- colour maths ----------

type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  const v = m ? parseInt(m[1], 16) : 0;
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  return "#" + [r, g, b].map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

const hsl = (hex: string) => rgbToHsl(hexToRgb(hex));
const fromHsl = (h: number, s: number, l: number) => rgbToHex(hslToRgb(((h % 360) + 360) % 360, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, l))));

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Moves a colour's lightness toward `dir` until it reaches `ratio` against `against`. */
function until(hex: string, against: string, ratio: number, dir: "darker" | "lighter"): string {
  const [h, s, l0] = hsl(hex);
  let l = l0;
  let out = hex;
  for (let i = 0; i < 60 && contrast(out, against) < ratio; i++) {
    l += dir === "darker" ? -0.02 : 0.02;
    out = fromHsl(h, s, l);
  }
  return out;
}

/** A readable palette from any hero and accent hue: every pairing the site draws passes 4.5:1. */
export function balance(heroHex: string, accentHex: string, opts: { muted?: boolean } = {}): SitePalette {
  const [h, s0] = hsl(heroHex);
  const s = opts.muted ? Math.min(s0, 0.28) : Math.max(s0, 0.35);
  const light = fromHsl(h, Math.min(s, 0.45), 0.94);
  const deep = fromHsl(h, Math.min(s, 0.6), 0.12);
  const hero = until(fromHsl(h, s, Math.min(hsl(heroHex)[2], 0.45)), light, 4.6, "darker");
  const [ah, as] = hsl(accentHex);
  const accent = until(fromHsl(ah, Math.max(as, opts.muted ? 0.3 : 0.6), Math.max(hsl(accentHex)[2], 0.6)), deep, 6, "lighter");
  return { hero, deep, accent, light };
}

/** True when two hues are close enough to read as one colour. */
function sameHue(a: string, b: string): boolean {
  const d = Math.abs(hsl(a)[0] - hsl(b)[0]);
  return Math.min(d, 360 - d) < 28;
}

export interface Look {
  id: string;
  label: string;
  design: SiteDesign;
}

/**
 * Four looks from a cover's colours (most common first): bold, its quiet twin, one led by the
 * second colour, and a dark night version.
 */
export function looksFromColours(colours: string[]): Look[] {
  const chromatic = colours.filter((c) => hsl(c)[1] > 0.18 && hsl(c)[2] > 0.08 && hsl(c)[2] < 0.92);
  const main = chromatic[0] ?? colours[0] ?? "#ad3a17";
  const second = chromatic.find((c) => !sameHue(c, main)) ?? fromHsl(hsl(main)[0] + 150, 0.75, 0.6);
  return [
    { id: "cover-bold", label: "Bold", design: { palette: balance(main, second), label: "From your cover: bold" } },
    { id: "cover-quiet", label: "Quiet", design: { palette: balance(main, second, { muted: true }), label: "From your cover: quiet" } },
    { id: "cover-second", label: "Second colour", design: { palette: balance(second, main), label: "From your cover: second colour" } },
    {
      id: "cover-night",
      label: "Night",
      design: { palette: { ...balance(main, second), hero: fromHsl(hsl(main)[0], 0.35, 0.16) }, label: "From your cover: night" },
    },
  ];
}

/** Hand-picked looks for authors without covers yet; the first is the Jollof Pages house look. */
export const PRESETS: Look[] = [
  { id: "jollof", label: "Jollof", design: { palette: { hero: "#ad3a17", deep: "#3a140a", accent: "#f2b632", light: "#f7ecdf" } } },
  { id: "indigo", label: "Adire indigo", design: { palette: balance("#1f3f7a", "#e8b04a") } },
  { id: "palm", label: "Palm", design: { palette: balance("#1f5c3f", "#f0c24b") } },
  { id: "kola", label: "Kola", design: { palette: balance("#7a2348", "#f29b6b") } },
  { id: "laterite", label: "Laterite", design: { palette: balance("#9a4a22", "#7fd1c2") } },
  { id: "ink", label: "Ink", design: { palette: balance("#2a2a33", "#f2b632", { muted: true }) } },
  { id: "ocean", label: "Lagoon", design: { palette: balance("#0f5f73", "#ffb38a") } },
  { id: "plum", label: "Plum", design: { palette: balance("#4b2a6b", "#c6e86a") } },
].map((l) => ({ ...l, design: { ...l.design, label: l.label } }));

// ---------- fonts (all SIL Open Font License, from Google Fonts) ----------

export interface FontPair {
  id: string;
  label: string;
  heading: string;
  body: string;
  /** the family part of a fonts.googleapis.com css2 URL */
  query: string;
  /** wide headings only suit Archivo's width axis */
  wide?: boolean;
}

export const FONT_PAIRS: FontPair[] = [
  { id: "archivo", label: "Archivo Wide", heading: "var(--font-archivo)", body: "var(--font-archivo)", query: "", wide: true },
  { id: "fraunces", label: "Fraunces + Inter", heading: "'Fraunces'", body: "'Inter'", query: "family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600" },
  { id: "playfair", label: "Playfair + Source Sans", heading: "'Playfair Display'", body: "'Source Sans 3'", query: "family=Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;600" },
  { id: "dmserif", label: "DM Serif + DM Sans", heading: "'DM Serif Display'", body: "'DM Sans'", query: "family=DM+Serif+Display&family=DM+Sans:wght@400;500;700" },
  { id: "bricolage", label: "Bricolage Grotesque", heading: "'Bricolage Grotesque'", body: "'Bricolage Grotesque'", query: "family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800" },
  { id: "libre", label: "Libre Baskerville + Lato", heading: "'Libre Baskerville'", body: "'Lato'", query: "family=Libre+Baskerville:wght@400;700&family=Lato:wght@400;700" },
  { id: "syne", label: "Syne + Manrope", heading: "'Syne'", body: "'Manrope'", query: "family=Syne:wght@600;800&family=Manrope:wght@400;600" },
  { id: "cormorant", label: "Cormorant + Nunito Sans", heading: "'Cormorant Garamond'", body: "'Nunito Sans'", query: "family=Cormorant+Garamond:wght@600;700&family=Nunito+Sans:wght@400;600" },
];

export const PATTERNS: { id: PatternKind | "none"; label: string }[] = [
  { id: "adire", label: "Adire" },
  { id: "wax", label: "Wax print" },
  { id: "weave", label: "Aso-oke weave" },
  { id: "pepper", label: "Pepper" },
  { id: "rice", label: "Rice" },
  { id: "none", label: "Plain" },
];

// ---------- templates: how the home page is laid out ----------

export type TemplateId = "classic" | "spotlight" | "shelf" | "letter";

export const TEMPLATES: { id: TemplateId; label: string; blurb: string }[] = [
  { id: "classic", label: "Classic", blurb: "Your name large, your lead book beside it, then every book, your letter and the reader list." },
  { id: "spotlight", label: "Spotlight", blurb: "One book up front with its description and a buy button. Best when you have a new release." },
  { id: "shelf", label: "Bookshelf", blurb: "A short header, then your books straight away in big covers. Best when you have many books." },
  { id: "letter", label: "Letter", blurb: "Your letter to readers comes first, with your books listed after it. Quiet and personal." },
];

export function templateOf(d: SiteDesign | null | undefined): TemplateId {
  return TEMPLATES.some((t) => t.id === d?.template) ? (d!.template as TemplateId) : "classic";
}

export function fontPair(d: SiteDesign | null | undefined): FontPair {
  return FONT_PAIRS.find((f) => f.id === d?.fonts) ?? FONT_PAIRS[0];
}

export function fontsHref(d: SiteDesign | null | undefined): string {
  const f = fontPair(d);
  return f.query ? `https://fonts.googleapis.com/css2?${f.query}&display=swap` : "";
}

const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** The CSS that turns the house look into the author's. Values are checked, never passed through. */
export function designCss(d: SiteDesign | null | undefined): string {
  if (!d) return "";
  const rules: string[] = [];
  const p = d.palette;
  if (p && isHex(p.hero) && isHex(p.deep) && isHex(p.accent) && isHex(p.light)) {
    const [h, s] = hsl(p.hero);
    rules.push(
      `.site.site{--jollof:${p.hero};--jollof-2:${fromHsl(h, s, hsl(p.hero)[2] + 0.06)};--pepper:${fromHsl(h, s, hsl(p.hero)[2] + 0.12)};` +
        `--char:${p.deep};--char-2:${fromHsl(hsl(p.deep)[0], hsl(p.deep)[1], hsl(p.deep)[2] + 0.06)};--bonnet:${p.accent};` +
        `--cream:${p.light};--cream-2:${fromHsl(hsl(p.light)[0], hsl(p.light)[1], hsl(p.light)[2] - 0.05)}}`,
      `[data-theme="dark"] .site.site{--ground:${fromHsl(hsl(p.deep)[0], hsl(p.deep)[1], 0.06)};--ground-2:${fromHsl(hsl(p.deep)[0], hsl(p.deep)[1], 0.09)}}`,
    );
  }
  const f = fontPair(d);
  if (f.id !== "archivo") {
    rules.push(
      `.site.site{font-family:${f.body},ui-sans-serif,system-ui,sans-serif}`,
      `.site.site h1,.site.site h2,.site.site h3,.site.site .wide{font-family:${f.heading},ui-serif,Georgia,serif;font-stretch:normal;font-variation-settings:normal}`,
      `.site.site .t-display{letter-spacing:-0.02em;line-height:0.95}`,
    );
  }
  return rules.join("\n");
}

export function patternOf(d: SiteDesign | null | undefined, fallback: PatternKind): PatternKind | null {
  const p = d?.pattern;
  if (p === "none") return null;
  return PATTERNS.some((x) => x.id === p) ? (p as PatternKind) : fallback;
}

// ---------- reading colours off a cover (browser only) ----------

/** The most common colours of an image, most common first, ignoring near-greys when it can. */
export async function coverColours(url: string, count = 6): Promise<string[]> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = Math.max(1, Math.round((size * img.naturalHeight) / img.naturalWidth));
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  // bucket into 4-bit-per-channel bins, then average each bin
  const bins = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n++;
    bin.r += data[i];
    bin.g += data[i + 1];
    bin.b += data[i + 2];
    bins.set(key, bin);
  }
  const ranked = [...bins.values()]
    .map((b) => ({ n: b.n, hex: rgbToHex([b.r / b.n, b.g / b.n, b.b / b.n]) }))
    .map((c) => ({ ...c, score: c.n * (0.35 + hsl(c.hex)[1]) }))
    .sort((a, b) => b.score - a.score);
  const out: string[] = [];
  for (const c of ranked) {
    if (out.every((o) => contrast(o, c.hex) > 1.25 || !sameHue(o, c.hex))) out.push(c.hex);
    if (out.length >= count) break;
  }
  return out;
}
