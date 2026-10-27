/** Adapted from Mint Playground's Complete Shelf (MIT, see LICENSE). */
export type BookMotif =
  | "lattice"
  | "corrosion"
  | "efficiency"
  | "network"
  | "boom"
  | "organization"
  | "schematic"
  | "flight"
  | "circuit"
  | "orbit"
  | "branches"
  | "wave"
  | "runner"
  | "gather"
  | "maze"
  | "fracture"
  | "continuum"
  | "windows"
  | "steps";

export type CatalogBook = {
  id: string;
  title: string;
  shortTitle: string;
  author: string;
  description: string;
  quote: string;
  quoteBy: string;
  format: string;
  availability: string;
  url: string;
  cover: string;
  accent: string;
  ink: string;
  motif: BookMotif;
  height: number;
  thickness: number;
  /**
   * Optional browser URL for contributor-owned front-cover art. Put local
   * images under `public/books/<id>/` and use a URL such as
   * `/books/<id>/cover.webp`.
   */
  coverImage?: string;
  linkLabel?: string;
  living?: boolean;
  /** Jollof Pages: the first store link and its price, shown beside the book page link. */
  buyUrl?: string;
  buyLabel?: string;
};
