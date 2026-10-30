/**
 * Scene-break ornaments: 6 typographic breaks plus 54 drawn ones (18 motifs in 3 arrangements).
 * The motifs are Lucide icons (ISC licence), set as small SVG that the print PDF, the EPUB and the
 * preview all embed, so every output shows the same ornament in the theme's accent colour.
 */
import { Anchor, Bird, Compass, Crown, Feather, Flame, Flower2, Heart, Key, Leaf, Moon, Rose, Skull, Snowflake, Sparkle, Star, Sun, Swords, type IconNode } from "lucide";

export type OrnamentLayout = "solo" | "flanked" | "trio";

export interface Ornament {
  id: string;
  name: string;
  /** typographic breaks are set as text; the rest are drawn */
  glyph?: string;
  kind: "text" | "rule" | "double" | "space" | "drawn";
  motif?: string;
  layout?: OrnamentLayout;
}

const MOTIFS: [string, string, IconNode][] = [
  ["feather", "Feather", Feather],
  ["leaf", "Leaf", Leaf],
  ["flower", "Flower", Flower2],
  ["rose", "Rose", Rose],
  ["sun", "Sun", Sun],
  ["moon", "Moon", Moon],
  ["star", "Star", Star],
  ["sparkle", "Sparkle", Sparkle],
  ["heart", "Heart", Heart],
  ["crown", "Crown", Crown],
  ["anchor", "Anchor", Anchor],
  ["key", "Key", Key],
  ["compass", "Compass", Compass],
  ["flame", "Flame", Flame],
  ["snowflake", "Snowflake", Snowflake],
  ["swords", "Swords", Swords],
  ["skull", "Skull", Skull],
  ["bird", "Bird", Bird],
];

const LAYOUT_NAMES: Record<OrnamentLayout, string> = { solo: "", flanked: "with rules", trio: "trio" };

export const ORNAMENTS: Ornament[] = [
  { id: "asterisms", name: "Three asterisks", glyph: "* * *", kind: "text" },
  { id: "dots", name: "Three dots", glyph: "• • •", kind: "text" },
  { id: "tildes", name: "Tildes", glyph: "~ ~ ~", kind: "text" },
  { id: "rule", name: "Short rule", kind: "rule" },
  { id: "double", name: "Double rule", kind: "double" },
  { id: "space", name: "Blank line", kind: "space" },
  ...MOTIFS.flatMap(([id, name]) =>
    (["solo", "flanked", "trio"] as OrnamentLayout[]).map((layout) => ({
      id: layout === "solo" ? id : `${id}-${layout}`,
      name: LAYOUT_NAMES[layout] ? `${name} ${LAYOUT_NAMES[layout]}` : name,
      kind: "drawn" as const,
      motif: id,
      layout,
    })),
  ),
];

export function getOrnament(id: string | undefined): Ornament {
  return ORNAMENTS.find((o) => o.id === id) ?? ORNAMENTS[0];
}

function iconSvg(node: IconNode, x: number, y: number, scale: number): string {
  const kids = node.map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${String(v)}"`).join(" ")}/>`).join("");
  return `<g transform="translate(${x} ${y}) scale(${scale})">${kids}</g>`;
}

/** The drawn ornament as a standalone SVG, or null for typographic breaks. Width/height are in px. */
export function ornamentSvg(id: string | undefined, color = "#1c1a17"): { svg: string; width: number; height: number } | null {
  const o = getOrnament(id);
  if (o.kind !== "drawn") return null;
  const icon = MOTIFS.find((m) => m[0] === o.motif)![2];
  const stroke = `fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`;
  let width = 24;
  let body: string;
  if (o.layout === "flanked") {
    width = 132;
    body = `<path d="M6 12H48M84 12H126" stroke-width="1"/>${iconSvg(icon, 54, 0, 1)}`;
  } else if (o.layout === "trio") {
    width = 84;
    body = `${iconSvg(icon, 4, 5, 0.58)}${iconSvg(icon, 30, 0, 1)}${iconSvg(icon, 66, 5, 0.58)}`;
  } else body = iconSvg(icon, 0, 0, 1);
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="24" viewBox="0 0 ${width} 24"><g ${stroke}>${body}</g></svg>`, width, height: 24 };
}

export function svgDataUri(svg: string): string {
  // brackets are encoded too, so the URI is safe inside CSS url(...) and style strings
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg).replace(/\(/g, "%28").replace(/\)/g, "%29")}`;
}
