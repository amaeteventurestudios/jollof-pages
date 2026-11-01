import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { caller } from "@/lib/server/credits";
import { parseBookCode, type IsbnBook } from "@/lib/isbn";

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
 * - ?title=…&author=… finds it by name instead, for Kindle books.
 * Works signed out too, for the homepage's "see your website", with a limit per visitor.
 */
export async function GET(req: Request) {
  // visitors try it on the homepage before they have an account, a few lookups an hour each
  const me = await caller(bearer(req));
  if (!me && limited(req)) return NextResponse.json({ error: "That's a lot of lookups. Try again in an hour, or sign up to keep going." }, { status: 429 });
  const q = new URL(req.url).searchParams;
  const title = (q.get("title") || "").trim();
  if (title) return byTitle(title, (q.get("author") || "").trim(), (q.get("asin") || "").toUpperCase());

  const code = parseBookCode(q.get("isbn") || "");
  if (!code)
    return NextResponse.json(
      { error: "That isn't an ISBN or an ASIN. Use the 10 or 13 digits from the copyright page, the ASIN from your book's Amazon page (under Product details), or paste the Amazon link." },
      { status: 400 },
    );
  if ("asin" in code) return NextResponse.json({ asin: code.asin, needsTitle: true });
  const isbn = code.isbn;

  type Data = { title?: string; subtitle?: string; authors?: { name: string }[]; publish_date?: string; number_of_pages?: number; publishers?: { name: string }[]; cover?: { large?: string; medium?: string } };
  const all = await json<Record<string, Data>>(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
  if (!all) return NextResponse.json({ error: "Could not reach Open Library just now. Try again in a minute." }, { status: 502 });
  const data = all[`ISBN:${isbn}`];
  if (!data?.title) return NextResponse.json({ error: "Open Library has no record of that ISBN yet. New books can take a few weeks to appear; you can still add it by hand with New book." }, { status: 404 });

  // the blurb lives on the work, not the edition
  const edition = await json<{ works?: { key: string }[]; description?: Text }>(`https://openlibrary.org/isbn/${isbn}.json`);
  const workKey = edition?.works?.[0]?.key;
  const work = workKey ? await json<{ description?: Text }>(`https://openlibrary.org${workKey}.json`) : null;

  const book: IsbnBook = {
    isbn,
    title: data.title,
    subtitle: data.subtitle ?? "",
    authors: (data.authors ?? []).map((a) => a.name),
    description: text(work?.description ?? edition?.description),
    publishDate: isoDate(data.publish_date ?? ""),
    pages: data.number_of_pages ?? 0,
    publisher: data.publishers?.[0]?.name ?? "",
    cover: await coverData(data.cover?.large || data.cover?.medium || ""),
  };
  return NextResponse.json(book);
}

/** A Kindle book: what Open Library knows by title and author, or just what the writer typed. */
async function byTitle(title: string, author: string, asin: string) {
  type Doc = { key: string; title: string; subtitle?: string; author_name?: string[]; cover_i?: number; first_publish_year?: number; number_of_pages_median?: number; publisher?: string[] };
  const url = `https://openlibrary.org/search.json?${new URLSearchParams({ title, ...(author ? { author } : {}), limit: "1", fields: "key,title,subtitle,author_name,cover_i,first_publish_year,number_of_pages_median,publisher" })}`;
  const hit = (await json<{ docs?: Doc[] }>(url))?.docs?.[0];
  const work = hit ? await json<{ description?: Text }>(`https://openlibrary.org${hit.key}.json`) : null;
  const book: IsbnBook = {
    isbn: "",
    ...(/^[A-Z0-9]{10}$/.test(asin) ? { asin } : {}),
    title: hit?.title || title,
    subtitle: hit?.subtitle ?? "",
    authors: hit?.author_name?.length ? hit.author_name : author ? [author] : [],
    description: text(work?.description),
    publishDate: "", // Open Library knows only the year of the first edition here
    pages: hit?.number_of_pages_median ?? 0,
    publisher: hit?.publisher?.[0] ?? "",
    cover: hit?.cover_i ? await coverData(`https://covers.openlibrary.org/b/id/${hit.cover_i}-L.jpg`) : "",
  };
  return NextResponse.json({ ...book, matched: Boolean(hit) });
}
