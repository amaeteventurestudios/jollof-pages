import { caller, adminPb } from "@/lib/server/credits";
import { recall, remember, resolve, streamReply } from "@/lib/server/assistant";
import { bearer } from "@/lib/server/load-book";
import { serverPb } from "@/lib/pb-server";
import { sortChapters } from "@/lib/book-model";
import { elementKind } from "@/lib/elements";
import { plainText } from "@/lib/doc/types";
import { withoutSuggestions } from "@/lib/doc/suggestions";
import { CHAPTER_CHARS, PROVIDERS, type ChatTurn } from "@/lib/assistant";
import type { Book, Chapter } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status: number) => Response.json(body, { status });

function chapterText(c: Chapter | null): string {
  const text = plainText(withoutSuggestions(c?.content ?? null), "\n\n").trim();
  if (text.length <= CHAPTER_CHARS) return text;
  // keep the opening for context and the end, where "continue" picks up
  return `${text.slice(0, 4000)}\n\n[…]\n\n${text.slice(-(CHAPTER_CHARS - 4000))}`;
}

/**
 * POST { bookId, chapterId?, message, selection? }: the writer's message, answered as a text stream
 * by their chosen model, with the book, the open chapter and what Mem0 remembers as context.
 */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return json({ error: "Sign in first." }, 401);
  const b = (await req.json().catch(() => ({}))) as { bookId?: string; chapterId?: string; message?: string; selection?: string };
  const message = String(b.message ?? "")
    .trim()
    .slice(0, 8000);
  if (!message) return json({ error: "Type a message first." }, 400);
  const r = await resolve(me);
  if (typeof r === "string") return json({ error: r, setup: true }, 400);

  // read the book as the writer, so its access rules apply
  const pb = serverPb(me.token);
  const book = await pb
    .collection("books")
    .getOne<Book>(String(b.bookId ?? ""))
    .catch(() => null);
  if (!book) return json({ error: "This book could not be opened." }, 404);
  const chapters = sortChapters(await pb.collection("chapters").getFullList<Chapter>({ filter: pb.filter("book = {:b}", { b: book.id }) }));
  const open = chapters.find((c) => c.id === b.chapterId) ?? null;
  const selection = String(b.selection ?? "")
    .trim()
    .slice(0, 6000);

  const admin = await adminPb();
  const history = (
    await admin.collection("assistant_messages").getList<ChatTurn & { created: string }>(1, 16, { filter: admin.filter("owner = {:u} && book = {:b}", { u: me.id, b: book.id }), sort: "-created" })
  ).items
    .reverse()
    .map(({ role, content }) => ({ role, content }));
  const memories = await recall(r, me.id, `${book.title} ${open?.title ?? ""} ${message}`);

  const outline = chapters
    .filter((c) => !elementKind(c.kind).smart)
    .map((c) => `- ${c.title || elementKind(c.kind).label}${c.id === open?.id ? "  (open now)" : ""}`)
    .join("\n");
  const system = [
    "You are the writing assistant inside Jollof Pages, a writing desk where authors write and publish books. Help this author with their book: drafting, rewriting, ideas, structure, consistency and feedback.",
    "Match the author's voice. When asked for prose, give only the prose, ready to paste, without preamble or notes. Otherwise be direct and brief. Plain text; use simple lists when they help. Never invent facts about the author.",
    `Book: "${book.title}"${book.subtitle ? `: ${book.subtitle}` : ""}.`,
    outline && `Sections, in order:\n${outline}`,
    memories.length ? `What you remember from earlier sessions (may be out of date):\n${memories.map((m) => `- ${m}`).join("\n")}` : "",
    open ? `The open section is "${open.title}". Its text:\n<chapter>\n${chapterText(open) || "(empty so far)"}\n</chapter>` : "",
    selection ? `The author has selected this passage:\n<selection>\n${selection}\n</selection>` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const turns: ChatTurn[] = [...history, { role: "user", content: message }];
  // providers want the conversation to start with the writer
  while (turns.length && turns[0].role !== "user") turns.shift();

  let stream: ReadableStream<string>;
  try {
    stream = await streamReply(r, system, turns, req.signal);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }

  let reply = "";
  const out = stream.pipeThrough(
    new TransformStream<string, Uint8Array>({
      transform(chunk, controller) {
        reply += chunk;
        controller.enqueue(new TextEncoder().encode(chunk));
      },
      async flush() {
        if (!reply.trim()) return;
        const model = `${PROVIDERS[r.provider].label} · ${r.model}`;
        await admin.collection("assistant_messages").create({ owner: me.id, book: book.id, role: "user", content: message, model });
        await admin.collection("assistant_messages").create({ owner: me.id, book: book.id, role: "assistant", content: reply, model });
        // memory is learned after the reply has gone out
        void remember(r, me.id, book.title, [
          { role: "user", content: message },
          { role: "assistant", content: reply },
        ]);
      },
    }),
  );
  return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Model": encodeURIComponent(`${PROVIDERS[r.provider].label} · ${r.model}`) } });
}
