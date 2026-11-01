import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { caller } from "@/lib/server/credits";
import { cleanIsbn, type IsbnBook } from "@/lib/isbn";

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

/**
 * GET ?isbn=… looks a published book up in Open Library (free, no key), so an author can show
 * books they published before Jollof Pages on their site.
 */
export async function GET(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const isbn = cleanIsbn(new URL(req.url).searchParams.get("isbn") || "");
  if (!isbn) return NextResponse.json({ error: "That is not a valid ISBN. Check the 10 or 13 digits on the back cover or copyright page." }, { status: 400 });

  type Data = { title?: string; subtitle?: string; authors?: { name: string }[]; publish_date?: string; number_of_pages?: number; publishers?: { name: string }[]; cover?: { large?: string; medium?: string } };
  const all = await json<Record<string, Data>>(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
  if (!all) return NextResponse.json({ error: "Could not reach Open Library just now. Try again in a minute." }, { status: 502 });
  const data = all[`ISBN:${isbn}`];
  if (!data?.title) return NextResponse.json({ error: "Open Library has no record of that ISBN yet. New books can take a few weeks to appear; you can still add it by hand with New book." }, { status: 404 });

  // the blurb lives on the work, not the edition
  let description = "";
  const edition = await json<{ works?: { key: string }[]; description?: string | { value: string } }>(`https://openlibrary.org/isbn/${isbn}.json`);
  const workKey = edition?.works?.[0]?.key;
  const work = workKey ? await json<{ description?: string | { value: string } }>(`https://openlibrary.org${workKey}.json`) : null;
  const d = work?.description ?? edition?.description;
  if (d) description = typeof d === "string" ? d : d.value;

  let cover = "";
  const coverUrl = data.cover?.large || data.cover?.medium;
  if (coverUrl) {
    const res = await fetch(coverUrl, { headers: UA, signal: AbortSignal.timeout(15000) }).catch(() => null);
    const type = res?.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    if (res?.ok && type.startsWith("image/")) cover = `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  }

  const book: IsbnBook = {
    isbn,
    title: data.title,
    subtitle: data.subtitle ?? "",
    authors: (data.authors ?? []).map((a) => a.name),
    description: description.replace(/\r\n/g, "\n").trim(),
    publishDate: isoDate(data.publish_date ?? ""),
    pages: data.number_of_pages ?? 0,
    publisher: data.publishers?.[0]?.name ?? "",
    cover,
  };
  return NextResponse.json(book);
}
