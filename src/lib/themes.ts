/**
 * Interior themes. One definition drives the print PDF (Typst), the EPUB stylesheet and the live
 * preview, so what you see in the studio is what the exports produce. All fonts are SIL OFL.
 */

export type ChapterLabel = "word" | "number" | "none";

export interface InteriorTheme {
  id: string;
  name: string;
  description: string;
  bodyFont: string;
  headingFont: string;
  /** CSS stacks for preview and EPUB (fonts are not embedded in the EPUB) */
  bodyCss: string;
  headingCss: string;
  chapterLabel: ChapterLabel;
  labelStyle: "smallcaps" | "upper" | "large";
  headingAlign: "left" | "center";
  headingItalic: boolean;
  headingWeight: number;
  /** chapter title size in pt for a 6x9 book */
  headingSize: number;
  /** indented paragraphs (books) or spaced blocks (manuals) */
  indent: boolean;
  /** the first words of a chapter in small caps */
  leadIn: boolean;
  sceneBreak: "asterisms" | "dots" | "rule" | "space";
  accent: string;
}

export const THEMES: InteriorTheme[] = [
  {
    id: "accra",
    name: "Accra",
    description: "Classic book face, centered headings, small-caps chapter labels.",
    bodyFont: "EB Garamond",
    headingFont: "EB Garamond",
    bodyCss: "'EB Garamond', Garamond, Georgia, serif",
    headingCss: "'EB Garamond', Garamond, Georgia, serif",
    chapterLabel: "word",
    labelStyle: "smallcaps",
    headingAlign: "center",
    headingItalic: false,
    headingWeight: 400,
    headingSize: 22,
    indent: true,
    leadIn: true,
    sceneBreak: "asterisms",
    accent: "#1c1a17",
  },
  {
    id: "lagos",
    name: "Lagos",
    description: "Modern serif with a strong sans heading and a large chapter number.",
    bodyFont: "Literata",
    headingFont: "Inter",
    bodyCss: "Literata, Georgia, serif",
    headingCss: "Inter, 'Helvetica Neue', Arial, sans-serif",
    chapterLabel: "number",
    labelStyle: "large",
    headingAlign: "left",
    headingItalic: false,
    headingWeight: 700,
    headingSize: 20,
    indent: true,
    leadIn: false,
    sceneBreak: "rule",
    accent: "#0f3d2e",
  },
  {
    id: "uyo",
    name: "Uyo",
    description: "Built for teaching books: spaced paragraphs, clear sans headings, callouts.",
    bodyFont: "Source Serif 4",
    headingFont: "Inter",
    bodyCss: "'Source Serif 4', Georgia, serif",
    headingCss: "Inter, 'Helvetica Neue', Arial, sans-serif",
    chapterLabel: "number",
    labelStyle: "upper",
    headingAlign: "left",
    headingItalic: false,
    headingWeight: 700,
    headingSize: 22,
    indent: false,
    leadIn: false,
    sceneBreak: "rule",
    accent: "#9a3b12",
  },
  {
    id: "dakar",
    name: "Dakar",
    description: "Elegant italic chapter titles over a light, airy page.",
    bodyFont: "Crimson Pro",
    headingFont: "Crimson Pro",
    bodyCss: "'Crimson Pro', Georgia, serif",
    headingCss: "'Crimson Pro', Georgia, serif",
    chapterLabel: "word",
    labelStyle: "upper",
    headingAlign: "center",
    headingItalic: true,
    headingWeight: 400,
    headingSize: 24,
    indent: true,
    leadIn: false,
    sceneBreak: "dots",
    accent: "#3a2a4a",
  },
  {
    id: "nairobi",
    name: "Nairobi",
    description: "Warm Lora text with display-serif titles.",
    bodyFont: "Lora",
    headingFont: "Playfair Display",
    bodyCss: "Lora, Georgia, serif",
    headingCss: "'Playfair Display', Georgia, serif",
    chapterLabel: "number",
    labelStyle: "large",
    headingAlign: "center",
    headingItalic: false,
    headingWeight: 700,
    headingSize: 22,
    indent: true,
    leadIn: true,
    sceneBreak: "asterisms",
    accent: "#5a1f1f",
  },
];

export function getTheme(id: string | undefined): InteriorTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Google Fonts stylesheet for the studio preview of every theme. */
export const THEME_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;600;700&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,700;1,7..72,400&family=Lora:ital,wght@0,400;0,700;1,400&family=Playfair+Display:wght@400;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,700;1,8..60,400&display=swap";

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

export function sceneBreakGlyph(theme: InteriorTheme): string {
  switch (theme.sceneBreak) {
    case "asterisms":
      return "* * *";
    case "dots":
      return "• • •";
    default:
      return "";
  }
}
