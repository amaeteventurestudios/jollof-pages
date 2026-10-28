import { caller } from "@/lib/server/credits";
import { resolve, streamReply } from "@/lib/server/assistant";
import { bearer } from "@/lib/server/load-book";
import { serverPb } from "@/lib/pb-server";
import { sortChapters } from "@/lib/book-model";
import { elementKind } from "@/lib/elements";
import { plainText } from "@/lib/doc/types";
import { withoutSuggestions } from "@/lib/doc/suggestions";
import { SUGGEST, parseList, type SuggestKind } from "@/lib/assistant";
import type { Book, Chapter } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => Response.json(body, { status });

/**
 * POST { kind, bookId?, context? }: a short list of suggestions (titles, a description, keywords,
 * cover prompts…) from the writer's own model, using the book when there is one and whatever the
 * writer has typed so far.
 */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return json({ error: "Sign in first." }, 401);
  const b = (await req.json().catch(() => ({}))) as { kind?: SuggestKind; bookId?: string; context?: Record<string, string> };
  const spec = b.kind && SUGGEST[b.kind];
  if (!spec) return json({ error: "Unknown suggestion." }, 400);
  const r = await resolve(me);
  if (typeof r === "string") return json({ error: r, setup: true }, 400);

  const facts: string[] = [];
  if (b.bookId) {
    const pb = serverPb(me.token);
    const book = await pb
      .collection("books")
      .getOne<Book>(b.bookId, { expand: "author" })
      .catch(() => null);
    if (!book) return json({ error: "This book could not be opened." }, 404);
    const chapters = sortChapters(await pb.collection("chapters").getFullList<Chapter>({ filter: pb.filter("book = {:b}", { b: book.id }) })).filter((c) => !elementKind(c.kind).smart);
    facts.push(`Title: ${book.title}`);
    if (book.subtitle) facts.push(`Subtitle: ${book.subtitle}`);
    if (book.series) facts.push(`Series: ${book.series}`);
    if (book.pitch) facts.push(`Hook: ${book.pitch}`);
    if (book.description) facts.push(`Description:\n${book.description.slice(0, 3000)}`);
    if (book.keywords?.length) facts.push(`Keywords already chosen: ${book.keywords.join("; ")}`);
    if (book.categories?.length) facts.push(`Categories: ${book.categories.join("; ")}`);
    if (chapters.length) facts.push(`Sections:\n${chapters.map((c) => `- ${c.title || elementKind(c.kind).label}`).join("\n")}`);
    // a taste of the writing, for voice and subject
    const sample = chapters
      .filter((c) => c.kind === "chapter" || !c.kind)
      .map((c) => plainText(withoutSuggestions(c.content ?? null), "\n\n").trim())
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 6000);
    if (sample) facts.push(`Opening of the manuscript:\n<manuscript>\n${sample}\n</manuscript>`);
  }
  for (const [k, v] of Object.entries(b.context ?? {})) {
    const val = String(v ?? "")
      .trim()
      .slice(0, 3000);
    if (val) facts.push(`${k}: ${val}`);
  }
  if (!facts.length) return json({ error: "Type a working title or a line about the book first, so there is something to go on." }, 400);

  const system = [
    "You help authors publish their books in Jollof Pages. You make suggestions the author chooses from.",
    "Base everything on the book details given. Never invent facts about the author. Match the book's genre and audience.",
    `Answer with a JSON array of exactly ${spec.count} strings and nothing else: no preamble, no numbering, no markdown.`,
  ].join(" ");
  const ask = `${facts.join("\n\n")}\n\n${spec.ask}`;
  try {
    const stream = await streamReply(r, system, [{ role: "user", content: ask }], req.signal);
    let text = "";
    const reader = stream.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      text += value;
    }
    const items = parseList(text, spec.count);
    if (!items.length) return json({ error: "The model didn't return any suggestions. Try again." }, 502);
    return json({ items });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
}
