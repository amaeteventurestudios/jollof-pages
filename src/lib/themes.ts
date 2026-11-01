/**
 * Interior themes. One definition drives the print PDF (Typst), the EPUB stylesheet and the live
 * preview, so what you see in the Desk is what the exports produce. All fonts are SIL OFL
 * (src/lib/fonts.ts). 93 themes, each named after an African city, built from a handful of
 * heading "looks" crossed with type pairings, colours, ornaments and drop caps. An author can
 * then change any part of a theme for their book (BookFormat.custom).
 */
import { fontCss, FONT_HREFS } from "./fonts";
import { getOrnament } from "./ornaments";
import type { BookFormat } from "./types";
import type { BoxLook, BoxPreset } from "./blocks";

export type ChapterLabel = "word" | "number" | "none";
export type DropCapStyle = "classic" | "accent" | "tall" | "boxed" | "outline" | "circle" | "script" | "none";
export type HeadingRule = "none" | "above" | "below" | "both" | "short";
export type ThemeCategory =
  | "Classic"
  | "Literary"
  | "Romance"
  | "Fantasy"
  | "Thriller and mystery"
  | "Science fiction"
  | "Horror"
  | "Historical"
  | "Young adult"
  | "Children's"
  | "Non-fiction"
  | "Business"
  | "Memoir"
  | "Faith"
  | "Poetry";

export const THEME_CATEGORIES: ThemeCategory[] = [
  "Classic",
  "Literary",
  "Romance",
  "Fantasy",
  "Thriller and mystery",
  "Science fiction",
  "Horror",
  "Historical",
  "Young adult",
  "Children's",
  "Non-fiction",
  "Business",
  "Memoir",
  "Faith",
  "Poetry",
];

export interface InteriorTheme {
  id: string;
  name: string;
  description: string;
  category: ThemeCategory;
  bodyFont: string;
  headingFont: string;
  /** CSS stacks for preview and EPUB (fonts are not embedded in the EPUB) */
  bodyCss: string;
  headingCss: string;
  chapterLabel: ChapterLabel;
  labelStyle: "smallcaps" | "upper" | "large";
  /** set the chapter label in its own face, e.g. a script "Chapter One" over a serif title */
  labelFont?: string;
  headingAlign: "left" | "center";
  headingItalic: boolean;
  headingWeight: number;
  /** chapter title size in pt for a 6x9 book */
  headingSize: number;
  headingCase: "normal" | "upper";
  /** hairlines around the chapter title */
  headingRule: HeadingRule;
  /** indented paragraphs (books) or spaced blocks (manuals) */
  indent: boolean;
  /** the first words of a chapter in small caps */
  leadIn: boolean;
  /** scene-break ornament id (src/lib/ornaments.ts) */
  ornament: string;
  dropCap: DropCapStyle;
  accent: string;
  /** a library background (src/lib/backgrounds.ts) behind chapter openings, if the theme has one */
  openerBackground?: string;
  /** the author's style for every block of a kind, by block id (src/lib/blocks.ts) */
  boxes?: Record<string, BoxLook>;
  /** the author's named block styles */
  boxPresets?: BoxPreset[];
  /* Edit styles: missing means the theme's own setting */
  /** justified text (both edges straight) */
  justify?: boolean;
  /** break long words at line ends */
  hyphenate?: boolean;
  /** extra space between paragraphs, in em */
  paraSpacing?: number;
  /** first-line indent, in em */
  indentSize?: number;
  /** how much space a chapter opening takes: 0.6 tight to 1.6 airy */
  headingSpace?: number;
  /** how a chapter subtitle is set */
  subtitleStyle?: "italic" | "smallcaps" | "plain";
  /** endnotes at the end of each chapter, or together on the book's Notes page */
  endnotes?: "chapter" | "book";
  /** how hard the print layout works to avoid a lone first or last line of a paragraph */
  widows?: "strict" | "normal" | "off";
}

export interface TextStyle {
  justify: boolean | null;
  hyphenate: boolean;
  paraSpacing: number | null;
  indentSize: number | null;
  headingSpace: number;
  subtitleStyle: "italic" | "smallcaps" | "plain";
  endnotes: "chapter" | "book";
  widows: "strict" | "normal" | "off";
}

const clampNum = (v: unknown, min: number, max: number): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(max, Math.max(min, v)) * 100) / 100 : null);

/** The Edit styles settings, checked, with null where the theme's own default applies. Every format reads them here. */
export function textStyle(t: InteriorTheme): TextStyle {
  return {
    justify: typeof t.justify === "boolean" ? t.justify : null,
    hyphenate: t.hyphenate !== false,
    paraSpacing: clampNum(t.paraSpacing, 0, 2),
    indentSize: clampNum(t.indentSize, 0, 4),
    headingSpace: clampNum(t.headingSpace, 0.5, 2) ?? 1,
    subtitleStyle: t.subtitleStyle === "smallcaps" || t.subtitleStyle === "plain" ? t.subtitleStyle : "italic",
    endnotes: t.endnotes === "book" ? "book" : "chapter",
    widows: t.widows === "strict" || t.widows === "off" ? t.widows : "normal",
  };
}

type Look = Pick<InteriorTheme, "chapterLabel" | "labelStyle" | "headingAlign" | "headingItalic" | "headingWeight" | "headingSize" | "headingCase" | "headingRule" | "indent" | "leadIn">;

const LOOKS = {
  classic: { chapterLabel: "word", labelStyle: "smallcaps", headingAlign: "center", headingItalic: false, headingWeight: 400, headingSize: 22, headingCase: "normal", headingRule: "none", indent: true, leadIn: true },
  modern: { chapterLabel: "number", labelStyle: "large", headingAlign: "left", headingItalic: false, headingWeight: 700, headingSize: 20, headingCase: "normal", headingRule: "none", indent: true, leadIn: false },
  teaching: { chapterLabel: "number", labelStyle: "upper", headingAlign: "left", headingItalic: false, headingWeight: 700, headingSize: 22, headingCase: "normal", headingRule: "none", indent: false, leadIn: false },
  elegant: { chapterLabel: "word", labelStyle: "upper", headingAlign: "center", headingItalic: true, headingWeight: 400, headingSize: 24, headingCase: "normal", headingRule: "none", indent: true, leadIn: false },
  grand: { chapterLabel: "number", labelStyle: "large", headingAlign: "center", headingItalic: false, headingWeight: 700, headingSize: 22, headingCase: "normal", headingRule: "none", indent: true, leadIn: true },
  capitals: { chapterLabel: "word", labelStyle: "upper", headingAlign: "center", headingItalic: false, headingWeight: 400, headingSize: 20, headingCase: "upper", headingRule: "both", indent: true, leadIn: true },
  ruled: { chapterLabel: "number", labelStyle: "upper", headingAlign: "left", headingItalic: false, headingWeight: 600, headingSize: 22, headingCase: "normal", headingRule: "below", indent: true, leadIn: false },
  minimal: { chapterLabel: "none", labelStyle: "upper", headingAlign: "left", headingItalic: false, headingWeight: 400, headingSize: 24, headingCase: "normal", headingRule: "none", indent: true, leadIn: false },
  romantic: { chapterLabel: "word", labelStyle: "large", headingAlign: "center", headingItalic: false, headingWeight: 400, headingSize: 22, headingCase: "normal", headingRule: "short", indent: true, leadIn: false },
  punchy: { chapterLabel: "number", labelStyle: "large", headingAlign: "left", headingItalic: false, headingWeight: 700, headingSize: 28, headingCase: "upper", headingRule: "none", indent: true, leadIn: false },
  storybook: { chapterLabel: "number", labelStyle: "large", headingAlign: "center", headingItalic: false, headingWeight: 700, headingSize: 26, headingCase: "normal", headingRule: "none", indent: false, leadIn: false },
  verse: { chapterLabel: "none", labelStyle: "smallcaps", headingAlign: "center", headingItalic: true, headingWeight: 400, headingSize: 20, headingCase: "normal", headingRule: "short", indent: false, leadIn: false },
  journal: { chapterLabel: "word", labelStyle: "smallcaps", headingAlign: "left", headingItalic: true, headingWeight: 400, headingSize: 22, headingCase: "normal", headingRule: "none", indent: true, leadIn: true },
  report: { chapterLabel: "number", labelStyle: "upper", headingAlign: "left", headingItalic: false, headingWeight: 700, headingSize: 19, headingCase: "normal", headingRule: "above", indent: false, leadIn: false },
} satisfies Record<string, Look>;

type LookId = keyof typeof LOOKS;

const LOOK_WORDS: Record<LookId, string> = {
  classic: "centred titles with small-caps chapter labels",
  modern: "a large chapter number set left",
  teaching: "spaced paragraphs and clear left headings",
  elegant: "italic chapter titles over a light page",
  grand: "a big centred chapter number",
  capitals: "capital titles between hairlines",
  ruled: "left titles over a fine rule",
  minimal: "plain titles with no chapter label",
  romantic: "a large chapter word over a short flourish",
  punchy: "bold capital titles and big numbers",
  storybook: "big friendly titles and roomy text",
  verse: "centred italic titles and unindented lines",
  journal: "italic titles set left, like a diary",
  report: "numbered sections under a rule",
};

/** [id, category, look, body font, heading font, accent, ornament, drop cap, label font?, opener background?] */
type Row = [string, ThemeCategory, LookId, string, string, string, string, DropCapStyle, string?, string?];

const ROWS: Row[] = [
  // the original five, unchanged
  ["accra", "Classic", "classic", "EB Garamond", "EB Garamond", "#1c1a17", "asterisms", "classic"],
  ["lagos", "Literary", "modern", "Literata", "Inter", "#0f3d2e", "rule", "accent"],
  ["uyo", "Non-fiction", "teaching", "Source Serif 4", "Inter", "#9a3b12", "rule", "accent"],
  ["dakar", "Literary", "elegant", "Crimson Pro", "Crimson Pro", "#3a2a4a", "dots", "classic"],
  ["nairobi", "Classic", "grand", "Lora", "Playfair Display", "#5a1f1f", "asterisms", "accent"],
  // classic
  ["kumasi", "Classic", "capitals", "Libre Baskerville", "Libre Baskerville", "#2b2622", "flower", "classic"],
  ["fes", "Classic", "classic", "Cardo", "Cinzel", "#6b4a1f", "leaf-flanked", "boxed"],
  ["alexandria", "Classic", "capitals", "Cormorant Garamond", "Cinzel", "#41352b", "feather-flanked", "tall"],
  ["timbuktu", "Classic", "classic", "Vollkorn", "Vollkorn", "#5b3a1a", "sun-flanked", "classic"],
  ["cape-coast", "Classic", "grand", "EB Garamond", "Cormorant SC", "#1f3a5f", "anchor-flanked", "outline"],
  ["kano", "Classic", "classic", "Old Standard TT", "Old Standard TT", "#3d2b1f", "dots", "classic"],
  ["calabar", "Classic", "elegant", "Spectral", "Spectral", "#4a2c2a", "flower-flanked", "accent"],
  // literary
  ["ibadan", "Literary", "minimal", "Newsreader", "Newsreader", "#2c2c2c", "space", "none"],
  ["kigali", "Literary", "ruled", "Source Serif 4", "Source Serif 4", "#14532d", "rule", "accent"],
  ["enugu", "Literary", "modern", "Merriweather", "Montserrat", "#7c2d12", "double", "accent"],
  ["lusaka", "Literary", "elegant", "Cormorant Garamond", "Cormorant Garamond", "#3f3f46", "feather", "tall"],
  ["harare", "Literary", "journal", "Alegreya", "Alegreya", "#78350f", "leaf", "classic"],
  ["windhoek", "Literary", "minimal", "Literata", "Space Grotesk", "#0f766e", "rule", "none"],
  ["asmara", "Literary", "ruled", "Gelasio", "Josefin Sans", "#9f1239", "dots", "outline"],
  // romance
  ["zanzibar", "Romance", "romantic", "Lora", "Playfair Display", "#be185d", "heart-flanked", "script", "Great Vibes"],
  ["marrakesh", "Romance", "romantic", "Cormorant Garamond", "Cormorant Garamond", "#9d174d", "rose-flanked", "script", "Great Vibes", "florals"],
  ["lamu", "Romance", "elegant", "Crimson Pro", "DM Serif Display", "#b4235a", "heart", "accent"],
  ["mombasa", "Romance", "romantic", "Libre Baskerville", "Great Vibes", "#a21caf", "rose", "script", "Great Vibes"],
  ["port-louis", "Romance", "classic", "Spectral", "Bodoni Moda", "#c2410c", "flower-trio", "circle"],
  ["victoria", "Romance", "elegant", "Lora", "Fraunces", "#be123c", "heart-trio", "script", "Great Vibes", "hearts"],
  ["tangier", "Romance", "romantic", "EB Garamond", "Playfair Display", "#7e22ce", "sparkle-flanked", "accent", "Great Vibes"],
  // fantasy
  ["lalibela", "Fantasy", "capitals", "Cardo", "Cinzel", "#7c2d12", "crown-flanked", "boxed"],
  ["gondar", "Fantasy", "grand", "EB Garamond", "Cinzel", "#1e3a8a", "swords-flanked", "tall"],
  ["aswan", "Fantasy", "capitals", "Alegreya", "Cinzel", "#854d0e", "sun-trio", "outline", undefined, "parchment"],
  ["axum", "Fantasy", "classic", "Cormorant Garamond", "Cormorant SC", "#4c1d95", "star-flanked", "boxed", undefined, "stars"],
  ["meroe", "Fantasy", "grand", "Vollkorn", "Cinzel", "#065f46", "leaf-trio", "tall"],
  ["great-zimbabwe", "Fantasy", "capitals", "Spectral", "Cinzel", "#57534e", "key-flanked", "outline"],
  ["kilwa", "Fantasy", "classic", "IM Fell English", "IM Fell English", "#713f12", "compass-flanked", "classic", undefined, "parchment"],
  ["mapungubwe", "Fantasy", "romantic", "Cardo", "Cinzel", "#b45309", "moon-trio", "boxed", undefined, "moons"],
  // thriller and mystery
  ["johannesburg", "Thriller and mystery", "punchy", "Source Serif 4", "Oswald", "#b91c1c", "rule", "none"],
  ["kinshasa", "Thriller and mystery", "punchy", "Merriweather", "Bebas Neue", "#111827", "double", "none"],
  ["douala", "Thriller and mystery", "modern", "PT Serif", "Oswald", "#991b1b", "key", "boxed"],
  ["mogadishu", "Thriller and mystery", "ruled", "Literata", "Space Grotesk", "#0f172a", "rule", "none"],
  ["abidjan", "Thriller and mystery", "punchy", "Newsreader", "Bebas Neue", "#7f1d1d", "key-flanked", "accent"],
  ["tripoli", "Thriller and mystery", "minimal", "Gelasio", "Oswald", "#1f2937", "dots", "none"],
  ["luanda", "Thriller and mystery", "modern", "Source Serif 4", "Montserrat", "#9a3412", "compass", "boxed"],
  // science fiction
  ["kampala", "Science fiction", "modern", "Literata", "Space Grotesk", "#0369a1", "star", "accent"],
  ["gaborone", "Science fiction", "punchy", "Source Serif 4", "Space Grotesk", "#4338ca", "sparkle-flanked", "boxed", undefined, "stars"],
  ["dodoma", "Science fiction", "ruled", "Newsreader", "Montserrat", "#0e7490", "rule", "outline"],
  ["juba", "Science fiction", "minimal", "Literata", "Josefin Sans", "#6d28d9", "star-trio", "none"],
  ["maputo", "Science fiction", "punchy", "PT Serif", "Bebas Neue", "#0f766e", "double", "boxed"],
  ["djibouti", "Science fiction", "modern", "Merriweather", "Raleway", "#1d4ed8", "moon-flanked", "accent", undefined, "topo"],
  // horror
  ["banjul", "Horror", "capitals", "IM Fell English", "IM Fell English", "#450a0a", "skull-flanked", "tall"],
  ["monrovia", "Horror", "punchy", "Crimson Pro", "Bebas Neue", "#7f1d1d", "skull", "outline"],
  ["bissau", "Horror", "elegant", "Cormorant Garamond", "Cormorant SC", "#3f0d0d", "moon", "tall", undefined, "grain"],
  ["niamey", "Horror", "classic", "Old Standard TT", "Cinzel", "#1c1917", "flame-flanked", "boxed"],
  // historical
  ["cairo", "Historical", "capitals", "Libre Baskerville", "Cinzel", "#713f12", "sun-flanked", "boxed", undefined, "parchment"],
  ["luxor", "Historical", "classic", "Cardo", "Cormorant SC", "#92400e", "feather-trio", "classic"],
  ["gorée", "Historical", "classic", "IM Fell English", "IM Fell English", "#44403c", "anchor", "classic"],
  ["ouidah", "Historical", "elegant", "EB Garamond", "EB Garamond", "#7c2d12", "leaf-flanked", "tall"],
  ["kairouan", "Historical", "capitals", "Vollkorn", "Cinzel", "#365314", "compass-trio", "boxed"],
  ["benin-city", "Historical", "grand", "Old Standard TT", "Playfair Display", "#9a3412", "crown", "classic"],
  // young adult
  ["soweto", "Young adult", "punchy", "Literata", "Poppins", "#db2777", "star-trio", "accent"],
  ["accra-new-town", "Young adult", "modern", "Merriweather", "Poppins", "#7c3aed", "sparkle", "circle"],
  ["durban", "Young adult", "storybook", "Nunito", "Fredoka", "#0891b2", "heart-trio", "circle"],
  ["kisumu", "Young adult", "modern", "Lora", "Montserrat", "#ea580c", "flame", "accent"],
  ["bulawayo", "Young adult", "punchy", "Source Serif 4", "Josefin Sans", "#be185d", "bird-flanked", "boxed"],
  // children's
  ["arusha", "Children's", "storybook", "Andika", "Fredoka", "#ea580c", "sun", "circle", undefined, "clouds"],
  ["malabo", "Children's", "storybook", "Nunito", "Fredoka", "#16a34a", "leaf", "circle", undefined, "confetti"],
  ["maun", "Children's", "storybook", "Andika", "Poppins", "#2563eb", "bird", "circle"],
  ["beira", "Children's", "storybook", "Nunito", "Fredoka", "#db2777", "star", "circle", undefined, "stars"],
  ["moroni", "Children's", "storybook", "Andika", "Kalam", "#7c3aed", "moon-trio", "circle", "Kalam", "moons"],
  ["swakopmund", "Children's", "storybook", "Nunito", "Kalam", "#0d9488", "snowflake-trio", "circle", "Kalam", "snow"],
  // non-fiction
  ["abuja", "Non-fiction", "teaching", "Merriweather", "Montserrat", "#1d4ed8", "rule", "accent"],
  ["addis-ababa", "Non-fiction", "ruled", "Source Serif 4", "Raleway", "#047857", "rule", "accent"],
  ["dar-es-salaam", "Non-fiction", "teaching", "PT Serif", "Poppins", "#c2410c", "dots", "boxed"],
  ["rabat", "Non-fiction", "report", "Literata", "Inter", "#0f766e", "rule", "none"],
  ["lilongwe", "Non-fiction", "modern", "Newsreader", "Inter", "#9333ea", "space", "accent"],
  ["tunis", "Non-fiction", "teaching", "Gelasio", "Josefin Sans", "#b45309", "compass", "outline"],
  // business
  ["lomé", "Business", "report", "Source Serif 4", "Inter", "#1e40af", "rule", "none"],
  ["cotonou", "Business", "teaching", "Merriweather", "Montserrat", "#0f172a", "double", "boxed"],
  ["casablanca", "Business", "punchy", "Literata", "Oswald", "#b91c1c", "rule", "boxed"],
  ["pretoria", "Business", "report", "PT Serif", "Raleway", "#065f46", "rule", "none"],
  ["kaduna", "Business", "modern", "Newsreader", "Space Grotesk", "#c2410c", "space", "accent"],
  // memoir
  ["stellenbosch", "Memoir", "journal", "Crimson Pro", "Crimson Pro", "#57534e", "feather", "classic"],
  ["entebbe", "Memoir", "journal", "Lora", "Kalam", "#9a3412", "leaf", "script", "Caveat"],
  ["cape-town", "Memoir", "elegant", "Spectral", "Spectral", "#1e3a8a", "anchor-trio", "tall"],
  ["abeokuta", "Memoir", "journal", "EB Garamond", "Caveat", "#7c2d12", "flower", "classic", "Caveat", "linen"],
  ["omdurman", "Memoir", "minimal", "Newsreader", "Newsreader", "#334155", "dots", "none"],
  // faith
  ["jos", "Faith", "classic", "Cormorant Garamond", "Cinzel", "#713f12", "sun-flanked", "boxed"],
  ["ife", "Faith", "elegant", "EB Garamond", "Cormorant SC", "#1e3a8a", "bird-flanked", "tall"],
  ["oyo", "Faith", "romantic", "Lora", "Playfair Display", "#7e22ce", "star-flanked", "accent", "Great Vibes"],
  ["owerri", "Faith", "teaching", "Merriweather", "Raleway", "#0f766e", "leaf-trio", "accent"],
  // poetry
  ["brazzaville", "Poetry", "verse", "Cormorant Garamond", "Cormorant Garamond", "#3f3f46", "feather", "none"],
  ["antananarivo", "Poetry", "verse", "Spectral", "Spectral", "#14532d", "leaf", "none"],
  ["freetown", "Poetry", "verse", "Crimson Pro", "Fraunces", "#7c2d12", "bird", "none", undefined, "watercolor"],
  ["praia", "Poetry", "verse", "EB Garamond", "Great Vibes", "#9d174d", "rose", "none", "Great Vibes"],
  ["bamako", "Poetry", "minimal", "Newsreader", "Josefin Sans", "#1e293b", "space", "none"],
];

const LABELS: Record<string, string> = { "gorée": "Gorée", "lomé": "Lomé", "accra-new-town": "Accra New Town", "dar-es-salaam": "Dar es Salaam", "addis-ababa": "Addis Ababa" };

function titleCase(id: string): string {
  return LABELS[id] ?? id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const ORIGINAL_DESCRIPTIONS: Record<string, string> = {
  accra: "Classic book face, centered headings, small-caps chapter labels.",
  lagos: "Modern serif with a strong sans heading and a large chapter number.",
  uyo: "Built for teaching books: spaced paragraphs, clear sans headings, callouts.",
  dakar: "Elegant italic chapter titles over a light, airy page.",
  nairobi: "Warm Lora text with display-serif titles.",
};

export const THEMES: InteriorTheme[] = ROWS.map(([id, category, look, body, heading, accent, ornament, dropCap, labelFont, openerBackground]) => {
  const l = LOOKS[look];
  return {
    id: id.normalize("NFD").replace(/[̀-ͯ]/g, ""),
    name: titleCase(id),
    description: ORIGINAL_DESCRIPTIONS[id] ?? `${body} text with ${heading === body ? "matching" : heading} headings: ${LOOK_WORDS[look]}.`,
    category,
    bodyFont: body,
    headingFont: heading,
    bodyCss: fontCss(body),
    headingCss: fontCss(heading),
    ...l,
    ...(labelFont ? { labelFont } : {}),
    ornament,
    dropCap,
    accent,
    ...(openerBackground ? { openerBackground } : {}),
  };
});

export function getTheme(id: string | undefined): InteriorTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** What an author may change on top of their theme. */
export type ThemeCustom = Partial<
  Pick<
    InteriorTheme,
    | "bodyFont"
    | "headingFont"
    | "labelFont"
    | "chapterLabel"
    | "labelStyle"
    | "headingAlign"
    | "headingItalic"
    | "headingCase"
    | "headingRule"
    | "headingWeight"
    | "indent"
    | "leadIn"
    | "ornament"
    | "dropCap"
    | "accent"
    | "boxes"
    | "boxPresets"
    | "justify"
    | "hyphenate"
    | "paraSpacing"
    | "indentSize"
    | "headingSpace"
    | "subtitleStyle"
    | "endnotes"
    | "widows"
  >
>;

/** The book's theme with the author's changes applied. Use this, not getTheme, when rendering a book. */
export function themeFor(format: Pick<BookFormat, "theme"> & { custom?: ThemeCustom | null }): InteriorTheme {
  const base = getTheme(format.theme);
  const c = format.custom;
  if (!c || !Object.keys(c).length) return base;
  const t: InteriorTheme = { ...base, ...c };
  if (c.bodyFont) t.bodyCss = fontCss(c.bodyFont);
  if (c.headingFont) t.headingCss = fontCss(c.headingFont);
  if (c.labelFont === "") delete t.labelFont;
  return t;
}

/** Google Fonts stylesheets for the Desk preview of every theme. */
export const THEME_FONTS_HREFS = FONT_HREFS;
/** @deprecated one stylesheet is not enough for every family; use THEME_FONTS_HREFS */
export const THEME_FONTS_HREF = FONT_HREFS[0];

/** Text for a typographic scene break; empty for drawn ornaments, rules and blank lines. */
export function sceneBreakGlyph(theme: InteriorTheme): string {
  return getOrnament(theme.ornament).glyph ?? "";
}

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

export function numberWord(n: number): string {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
  return String(n);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Chapter One", "1" or "" depending on the theme. */
export function chapterLabel(theme: InteriorTheme, n: number): string {
  if (theme.chapterLabel === "none") return "";
  if (theme.chapterLabel === "word") return `Chapter ${capitalize(numberWord(n))}`;
  return theme.labelStyle === "large" ? String(n) : `Chapter ${n}`;
}
