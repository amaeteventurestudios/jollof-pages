/**
 * AI cover art: what pictures cost and how the studio writes the prompt.
 *
 * Pricing is pay-as-you-go with no subscription. Of every $10 a writer tops up, about $4 is
 * spent on the image model and the rest is margin (Stripe's fee comes out of the margin).
 * One credit is therefore worth 4 cents of model spend, and a picture costs what the model
 * charges for it, rounded up to whole credits.
 */

/** Dollars of model spend per credit: $4 of spend for every 100 credits sold at $10. */
export const CREDIT_SPEND_USD = 0.04;

export interface CreditPack {
  id: string;
  credits: number;
  cents: number;
  label: string;
}

/** $10 is the smallest top-up. Every pack is the same 10 credits per dollar. */
export const CREDIT_PACKS: CreditPack[] = [
  { id: "p10", credits: 100, cents: 1000, label: "$10" },
  { id: "p25", credits: 250, cents: 2500, label: "$25" },
  { id: "p50", credits: 500, cents: 5000, label: "$50" },
];

export type Quality = "draft" | "print";
export type Target = "front" | "back";

/**
 * Nano Banana 2 on fal.ai, per picture: $0.08 at 1K, $0.16 at 4K (fal.ai pricing, October 2026).
 * A draft is quick and cheap for trying ideas; print is 4K, which for a 2:3 cover is large
 * enough for a 6 x 9 in KDP front (1838 x 2775 px at 300 dpi).
 */
export const QUALITY: Record<Quality, { resolution: "1K" | "4K"; modelUsd: number; label: string; hint: string }> = {
  draft: { resolution: "1K", modelUsd: 0.08, label: "Draft", hint: "Fast, about 1000 px. For trying ideas." },
  print: { resolution: "4K", modelUsd: 0.16, label: "Print-ready 4K", hint: "Large enough for a paperback at 300 dpi." },
};

export function creditsFor(quality: Quality, count = 1): number {
  return Math.ceil(QUALITY[quality].modelUsd / CREDIT_SPEND_USD - 1e-9) * count;
}

/** How far a pack goes, for the top-up buttons. */
export function packReach(pack: CreditPack): { drafts: number; prints: number } {
  return { drafts: Math.floor(pack.credits / creditsFor("draft")), prints: Math.floor(pack.credits / creditsFor("print")) };
}

/** Aspect ratios the model accepts, portrait only (covers are tall). */
const ASPECTS: [string, number][] = [
  ["2:3", 2 / 3],
  ["3:4", 3 / 4],
  ["4:5", 4 / 5],
  ["9:16", 9 / 16],
  ["1:1", 1],
];

export function nearestAspect(width: number, height: number): string {
  const r = width / height;
  return ASPECTS.reduce((best, cur) => (Math.abs(cur[1] - r) < Math.abs(best[1] - r) ? cur : best))[0];
}

export const STYLES = [
  { id: "photo", label: "Photograph", text: "a striking, cinematic photograph with natural light and real textures" },
  { id: "illustrated", label: "Illustration", text: "a clean, modern editorial illustration with confident shapes" },
  { id: "painterly", label: "Painting", text: "a rich painterly artwork with visible brush texture" },
  { id: "graphic", label: "Minimal graphic", text: "a bold minimal graphic design built from a few simple shapes and lots of negative space" },
  { id: "vintage", label: "Vintage print", text: "a vintage screen-printed poster look with grain and limited ink colours" },
  { id: "abstract", label: "Abstract", text: "an abstract composition of colour, light and form" },
] as const;
export type StyleId = (typeof STYLES)[number]["id"];

export interface PromptInput {
  target: Target;
  style: StyleId;
  /** what the writer wants to see, in their words */
  idea: string;
  book: { title: string; subtitle?: string; author: string; description?: string };
  /** the colours picked in the cover designer */
  palette: { bg: string; fg: string; accent: string };
  usePalette: boolean;
  /** put the title and author on the picture instead of adding them in the designer */
  lettering: boolean;
  aspect: string;
  /** how much of each edge the printer may trim, plus a safe margin */
  edgePercent: number;
  /** a reference picture is sent along, such as the current front cover */
  matchReference: boolean;
}

function firstSentences(text: string, max = 320): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = cut.lastIndexOf(". ");
  return (stop > 80 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, "") + "…").trim();
}

/** Words only a prompt with lettering contains, so a result can tell whether it carries the title. */
export const LETTERING_MARK = "on the cover, large, clear and spelled exactly as given";

/** The starting prompt the studio writes for the writer, who can then edit it. */
export function buildCoverPrompt(p: PromptInput): string {
  const style = STYLES.find((s) => s.id === p.style)?.text ?? STYLES[0].text;
  const parts: string[] = [];
  const about = p.book.description ? ` The book is about: ${firstSentences(p.book.description)}` : "";
  const idea = p.idea.trim() ? ` Show ${p.idea.trim().replace(/\.$/, "")}.` : "";

  if (p.target === "front") {
    parts.push(`Book cover artwork for "${p.book.title}"${p.book.subtitle ? `, ${p.book.subtitle}` : ""}.${about}${idea}`);
    parts.push(`Make it ${style}.`);
  } else {
    parts.push(`Back cover artwork for the book "${p.book.title}", in the same style and colours as its front cover.${idea}`);
    parts.push(`Make it ${style}, but quiet and low in detail, because a paragraph of text sits on top. Keep the bottom-right corner plain: a barcode goes there.`);
  }
  if (p.matchReference) parts.push("Match the look, colours and mood of the attached reference picture.");
  if (p.usePalette) {
    parts.push(
      `Use this colour palette and keep to it: main colour ${p.palette.bg}, accent ${p.palette.accent}, and ${p.palette.fg} for anything light or for highlights.`,
    );
  }
  if (p.target === "front" && p.lettering) {
    parts.push(`Set the title "${p.book.title}"${p.book.subtitle ? ` and subtitle "${p.book.subtitle}"` : ""} and the author name "${p.book.author}" ${LETTERING_MARK}.`);
  } else if (p.target === "front") {
    parts.push("Do not include any text, letters or numbers: the title is added later. Leave calm, uncluttered space in the top third for the title and at the bottom for the author name.");
  } else {
    parts.push("No text, letters or numbers.");
  }
  parts.push(
    `Flat, full-bleed artwork only: no border, no frame, no mockup, no 3D book, no shadow around it. Portrait, ${p.aspect}. Keep faces and important detail at least ${p.edgePercent}% in from every edge, because the printer trims there.`,
  );
  return parts.join(" ");
}

/** A short, safe file name for a generated picture. */
export function generationFileName(title: string, target: Target, ext: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return `${base || "cover"}-${target}-${Date.now().toString(36)}.${ext}`;
}
