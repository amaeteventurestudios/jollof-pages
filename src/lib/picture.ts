/**
 * How a picture sits in a chapter: beside the text on the left or right, centred on its own line,
 * or across the page, at a width given as a percentage of the text column. Pictures saved before
 * widths existed keep the size their layout gave them.
 */
export type PictureAlign = "left" | "center" | "right" | "full";

export function pictureAlign(layout: unknown): PictureAlign {
  return layout === "left" || layout === "right" || layout === "full" ? layout : "center";
}

/** The width a picture shows at, as a whole percentage of the text column (15 to 100). */
export function pictureWidth(attrs: { layout?: unknown; width?: unknown } | null | undefined): number {
  const w = Number(attrs?.width);
  if (attrs?.width != null && Number.isFinite(w) && w >= 15 && w <= 100) return Math.round(w);
  const layout = String(attrs?.layout ?? "center");
  if (layout === "full") return 100;
  if (layout === "left" || layout === "right") return 42;
  if (layout === "small") return 50;
  return 85;
}
