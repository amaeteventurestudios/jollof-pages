/** Looking up books an author published elsewhere, by ISBN, ASIN or Amazon link (see /api/books/isbn). */

export interface IsbnBook {
  isbn: string; // "" when found by title and author
  asin?: string;
  title: string;
  subtitle: string;
  authors: string[];
  description: string;
  publishDate: string; // YYYY-MM-DD when Open Library knows the day, else ""
  pages: number;
  publisher: string;
  cover: string; // data: URL, or ""
}

/** ISBN-10 or ISBN-13 with a valid check digit, dashes and spaces removed. */
export function cleanIsbn(raw: string): string {
  const s = raw.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{13}$/.test(s)) {
    const sum = [...s].reduce((t, c, i) => t + Number(c) * (i % 2 ? 3 : 1), 0);
    return sum % 10 === 0 ? s : "";
  }
  if (/^\d{9}[\dX]$/.test(s)) {
    const sum = [...s].reduce((t, c, i) => t + (c === "X" ? 10 : Number(c)) * (10 - i), 0);
    return sum % 11 === 0 ? s : "";
  }
  return "";
}

/**
 * What the writer typed: an ISBN, an Amazon ASIN, or a whole Amazon link (…/dp/B0…, …/gp/product/…).
 * A 10-character ASIN that passes the ISBN-10 check is the print edition's ISBN, so it is
 * looked up as one; any other ASIN (Kindle books start with B0) comes back as an asin.
 */
export function parseBookCode(raw: string): { isbn: string } | { asin: string } | null {
  const text = raw.trim();
  const fromUrl = text.match(/\/(?:dp|gp\/product|gp\/aw\/d|product|e)\/([A-Za-z0-9]{10})(?=[/?#&]|$)/);
  const code = (fromUrl ? fromUrl[1] : text).replace(/[\s-]/g, "").toUpperCase();
  const isbn = cleanIsbn(code);
  if (isbn) return { isbn };
  if (/^B0[A-Z0-9]{8}$/.test(code)) return { asin: code };
  return null;
}

export const amazonLink = (asin: string) => `https://www.amazon.com/dp/${asin}`;
