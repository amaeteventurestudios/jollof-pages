import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { caller } from "@/lib/server/credits";
import { amazonHost, isbn10, parseBookCode, titleFromAmazonLink, type IsbnBook } from "@/lib/isbn";
import { amazonBook, paapiConfigured, splitTitle } from "@/lib/server/amazon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UA = { "User-Agent": "JollofPages/1.0 (book lookup; https://jollofpages.com)" };

function isoDate(s: string): string {
  const d = new Date(s);
  return s && !Number.isNaN(d.getTime()) && /\d{1,2}/.test(s.replace(/\d{4}/, "")) ? d.toISOString().slice(0, 10) : "";
}

async function json<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) }).catch(() => null);
  return res?.ok ? ((await res.json().catch(() => null)) as T | null) : null;
}

type Text = string | { value: string };
const text = (d?: Text) => (d ? (typeof d === "string" ? d : d.value) : "").replace(/\r\n/g, "\n").trim();

/** An Open Library cover, as a data: URL so the browser can upload it with the book. */
async function coverData(url: string): Promise<string> {
  if (!url) return "";
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) }).catch(() => null);
  const type = res?.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  if (!res?.ok || !type.startsWith("image/")) return "";
  const buf = Buffer.from(await res.arrayBuffer());
  // Open Library answers a missing cover with a tiny placeholder
  return buf.length > 2000 ? `data:${type};base64,${buf.toString("base64")}` : "";
}

const tries = new Map<string, { at: number; n: number }>();
/** True once a signed-out visitor has made 20 lookups this hour. */
function limited(req: Request): boolean {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const t = tries.get(ip);
  if (!t || now - t.at > 3600_000) {
    if (tries.size > 5000) tries.clear();
    tries.set(ip, { at: now, n: 1 });
    return false;
  }
  return ++t.n > 20;
}

/**
 * GET looks up a book an author published before Jollof Pages, in Open Library (free, no key):
 * - ?isbn=… takes an ISBN, an ASIN or an Amazon link. A print ASIN is its ISBN-10, so it is
 *   looked up. Amazon doesn't share Kindle (B0…) details, so those answer { asin, needsTitle }.
 * - ?title=…&author=… finds it by name instead, for Kindle books, in Google Books then Open Library.
 * Works signed out too, for the homepage's "see your website", with a limit per visitor.
 */
export async function GET(req: Request) {
  // visitors try it on the homepage before they have an account, a few lookups an hour each
  const me = await caller(bearer(req));
  if (!me && limited(req)) return NextResponse.json({ error: "That's a lot of lookups. Try again in an hour, or sign up to keep going." }, { status: 429 });
  const q = new URL(req.url).searchParams;
  const title = (q.get("title") || "").trim();
  if (title) return byTitle(title, (q.get("author") || "").trim(), (q.get("asin") || "").toUpperCase());

  const raw = q.get("isbn") || "";
  const code = parseBookCode(raw);
  if (!code)
    return NextResponse.json(
      { error: "That isn't an ISBN or an ASIN. Use the 10 or 13 digits from the copyright page, the ASIN from your book's Amazon page (under Product details), or paste the Amazon link." },
      { status: 400 },
    );
  const host = amazonHost(raw);
  if ("asin" in code) {
    // with Amazon's own API, a Kindle ASIN gives everything: title, author, cover and each format
    const az = paapiConfigured() ? await amazonBook(code.asin, host || undefined) : null;
    if (az)
      return NextResponse.json({
        isbn: "",
        asin: az.asin,
        title: az.title,
        subtitle: az.subtitle,
        authors: az.authors,
        description: "",
        publishDate: az.publishDate,
        pages: az.pages,
        publisher: az.publisher,
        cover: await coverData(az.cover),
        formats: az.formats,
        matched: true,
        host,
      } satisfies IsbnBook & { matched: boolean; host: string });
    // otherwise only the title Amazon puts in a pasted link, and the writer's Amazon store, for the buy button
    return NextResponse.json({ asin: code.asin, needsTitle: true, guess: titleFromAmazonLink(raw), host });
  }
  const isbn = code.isbn;
  // a print book's ASIN is its ISBN-10: Amazon's API adds its formats and prices
  const az10 = isbn10(isbn);
  const azPromise = paapiConfigured() && az10 ? amazonBook(az10, host || undefined) : Promise.resolve(null);

  type Data = { title?: string; subtitle?: string; authors?: { name: string }[]; publish_date?: string; number_of_pages?: number; publishers?: { name: string }[]; cover?: { large?: string; medium?: string } };
  const all = await json<Record<string, Data>>(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
  const az = await azPromise;
  const data = all?.[`ISBN:${isbn}`];
  if (!data?.title && az)
    return NextResponse.json({
      isbn,
      ...(az10 ? { asin: az10 } : {}),
      title: az.title,
      subtitle: az.subtitle,
      authors: az.authors,
      description: "",
      publishDate: az.publishDate,
      pages: az.pages,
      publisher: az.publisher,
      cover: await coverData(az.cover),
      formats: az.formats,
    } satisfies IsbnBook);
  if (!all) return NextResponse.json({ error: "Could not reach Open Library just now. Try again in a minute." }, { status: 502 });
  if (!data?.title) return NextResponse.json({ error: "Open Library has no record of that ISBN yet. New books can take a few weeks to appear; you can still add it by hand with New book." }, { status: 404 });

  // the blurb lives on the work, not the edition
  const edition = await json<{ works?: { key: string }[]; description?: Text }>(`https://openlibrary.org/isbn/${isbn}.json`);
  const workKey = edition?.works?.[0]?.key;
  const work = workKey ? await json<{ description?: Text }>(`https://openlibrary.org${workKey}.json`) : null;

  const book: IsbnBook = {
    isbn,
    ...(az ? { asin: az10 } : {}),
    title: data.title,
    subtitle: data.subtitle ?? "",
    authors: (data.authors ?? []).map((a) => a.name),
    description: text(work?.description ?? edition?.description),
    publishDate: isoDate(data.publish_date ?? ""),
    pages: data.number_of_pages ?? 0,
    publisher: data.publishers?.[0]?.name ?? "",
    cover: (await coverData(data.cover?.large || data.cover?.medium || "")) || (az ? await coverData(az.cover) : ""),
    ...(az?.formats.length ? { formats: az.formats } : {}),
  };
  return NextResponse.json(book);
}

type Volume = {
  volumeInfo?: { title?: string; subtitle?: string; authors?: string[]; description?: string; publisher?: string; publishedDate?: string; pageCount?: number; imageLinks?: { thumbnail?: string; small?: string; medium?: string; large?: string } };
};

/**
 * Google Books, which knows many self-published Kindle books Open Library doesn't. With
 * GOOGLE_BOOKS_API_KEY it has a daily quota of its own; without one, shared limits may refuse it.
 */
async function googleBooks(title: string, author: string): Promise<Omit<IsbnBook, "isbn"> | null> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const query = `intitle:${title}${author ? ` inauthor:${author}` : ""}`;
  const url = `https://www.googleapis.com/books/v1/volumes?${new URLSearchParams({ q: query, maxResults: "1", printType: "books", ...(key ? { key } : {}) })}`;
  const v = (await json<{ items?: Volume[] }>(url))?.items?.[0]?.volumeInfo;
  if (!v?.title) return null;
  const img = v.imageLinks?.large || v.imageLinks?.medium || v.imageLinks?.small || v.imageLinks?.thumbnail || "";
  const split = v.subtitle ? { title: v.title, subtitle: v.subtitle } : splitTitle(v.title);
  return {
    ...split,
    authors: v.authors ?? [],
    // Google sends the blurb as simple HTML
    description: (v.description ?? "")
      .replace(/<br\s*\/?>|<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim(),
    publishDate: /^\d{4}-\d{2}-\d{2}$/.test(v.publishedDate ?? "") ? (v.publishedDate as string) : "",
    pages: v.pageCount ?? 0,
    publisher: v.publisher ?? "",
    cover: img ? await coverData(img.replace(/^http:/, "https:").replace(/&edge=curl/, "")) : "",
  };
}

/** Open Library's best match for a title (and author), or null. */
async function openLibrary(title: string, author: string): Promise<Omit<IsbnBook, "isbn"> | null> {
  type Doc = { key: string; title: string; subtitle?: string; author_name?: string[]; cover_i?: number; number_of_pages_median?: number; publisher?: string[] };
  const url = `https://openlibrary.org/search.json?${new URLSearchParams({ title, ...(author ? { author } : {}), limit: "1", fields: "key,title,subtitle,author_name,cover_i,number_of_pages_median,publisher" })}`;
  const hit = (await json<{ docs?: Doc[] }>(url))?.docs?.[0];
  if (!hit) return null;
  const work = await json<{ description?: Text }>(`https://openlibrary.org${hit.key}.json`);
  return {
    title: hit.title,
    subtitle: hit.subtitle ?? "",
    authors: hit.author_name ?? [],
    description: text(work?.description),
    publishDate: "", // Open Library knows only the year of the first edition here
    pages: hit.number_of_pages_median ?? 0,
    publisher: hit.publisher?.[0] ?? "",
    cover: hit.cover_i ? await coverData(`https://covers.openlibrary.org/b/id/${hit.cover_i}-L.jpg`) : "",
  };
}

/** A Kindle book: what Google Books or Open Library know by title and author, or just what the writer typed. */
async function byTitle(title: string, author: string, asin: string) {
  const hit = (await googleBooks(title, author)) ?? (await openLibrary(title, author));
  const book: IsbnBook = {
    isbn: "",
    ...(/^[A-Z0-9]{10}$/.test(asin) ? { asin } : {}),
    title: hit?.title || title,
    subtitle: hit?.subtitle ?? "",
    authors: hit?.authors.length ? hit.authors : author ? [author] : [],
    description: hit?.description ?? "",
    publishDate: hit?.publishDate ?? "",
    pages: hit?.pages ?? 0,
    publisher: hit?.publisher ?? "",
    cover: hit?.cover ?? "",
  };
  return NextResponse.json({ ...book, matched: Boolean(hit) });
}
