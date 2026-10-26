import type { BookMotif, CatalogBook } from "@/components/site/complete-shelf/catalog";
import { isDark, isUpcoming, spineOf, toStageBook, year } from "./site-data";
import type { Book } from "./types";

const MOTIFS: BookMotif[] = ["lattice", "corrosion", "efficiency", "network", "boom", "organization", "schematic", "flight", "circuit", "orbit", "branches", "wave", "runner", "gather", "maze", "fracture", "continuum", "windows", "steps"];

function pick<T>(list: T[], key: string): T {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  return list[Math.abs(h) % list.length];
}

/** Turns a published book into a volume for the 3D shelf, at its real trim height and spine depth. */
export function toShelfBook(b: Book, i: number): CatalogBook {
  const sb = toStageBook(b, i);
  const praise = (b.praise ?? []).find((q) => q.quote);
  const buy = (b.buy_links ?? []).find((l) => l.url);
  const firstPara = b.description.split(/\n{2,}/)[0] ?? "";
  // 9 in tall reads as 2.1 scene units; spines are drawn 2.5x real so thin books still show a spine
  const height = Math.min(2.2, Math.max(1.8, sb.height * 0.234));
  const thickness = Math.min(0.3, Math.max(0.14, spineOf(sb) * 0.256 * 2.5));
  return {
    id: b.slug,
    title: b.title,
    shortTitle: b.title,
    author: sb.author,
    description: b.pitch || firstPara.slice(0, 320) || b.subtitle,
    quote: praise?.quote ?? "",
    quoteBy: praise ? [praise.source, praise.role].filter(Boolean).join(", ") : "",
    format: `Paperback · ${sb.pages} pages · ${sb.trimLabel}`,
    availability: isUpcoming(b) ? `Coming ${year(b.publication_date)}` : buy ? "Available now" : "Coming soon",
    url: `/books/${b.slug}`,
    cover: sb.accent,
    accent: "#f2b632",
    ink: isDark(sb.accent) ? "#f7ecdf" : "#3a140a",
    motif: pick(MOTIFS, b.slug),
    height,
    thickness,
    coverImage: sb.cover || undefined,
    linkLabel: "Open the book",
    living: true,
    buyUrl: buy?.url,
    buyLabel: buy ? `Buy on ${buy.label || "Amazon"}${buy.price ? ` · ${buy.price}` : ""}` : undefined,
  };
}
