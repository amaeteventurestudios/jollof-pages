/** Looking up books an author published elsewhere, by ISBN (see /api/books/isbn). */

export interface IsbnBook {
  isbn: string;
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
