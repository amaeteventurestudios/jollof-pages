import { caller } from "@/lib/server/credits";
import { resolve, streamReply } from "@/lib/server/assistant";
import { bearer } from "@/lib/server/load-book";
import { serverPb } from "@/lib/pb-server";
import { plainText } from "@/lib/doc/types";
import { withoutSuggestions } from "@/lib/doc/suggestions";
import { CHAPTER_CHARS, PROVIDERS } from "@/lib/assistant";
import { aiAction, aiFormatRule, aiInstruction } from "@/lib/ai-actions";
import type { Book, Chapter } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status: number) => Response.json(body, { status });

/**
 * POST { bookId, chapterId?, action, option?, selection?, before? }: one of the editor's AI tools,
 * answered as a text stream by the writer's own model. Unlike the chat, nothing is kept: the
 * writer reviews the answer in the editor and accepts or rejects it there.
 */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return json({ error: "Sign in first." }, 401);
  const b = (await req.json().catch(() => ({}))) as { bookId?: string; chapterId?: string; action?: string; option?: string; selection?: string; before?: string };
  const a = aiAction(String(b.action ?? ""));
  const instruction = a && aiInstruction(a.id, b.option);
  if (!a || !instruction) return json({ error: "Unknown writing tool." }, 400);
  const selection = String(b.selection ?? "").trim().slice(0, 8000);
  const before = String(b.before ?? "").slice(-6000);
  if (a.needs === "selection" && !selection) return json({ error: "Select some words first." }, 400);
  const r = await resolve(me);
  if (typeof r === "string") return json({ error: r, setup: true }, 400);

  // read the book as the writer, so its access rules apply
  const pb = serverPb(me.token);
  const book = await pb
    .collection("books")
    .getOne<Book>(String(b.bookId ?? ""))
    .catch(() => null);
  if (!book) return json({ error: "This book could not be opened." }, 404);
  const open = b.chapterId
    ? await pb
        .collection("chapters")
        .getOne<Chapter>(b.chapterId)
        .catch(() => null)
    : null;
  const chapter = open && open.book === book.id ? plainText(withoutSuggestions(open.content ?? null), "\n\n").trim().slice(0, CHAPTER_CHARS) : "";

  const system = [
    "You are a writing tool inside Jollof Pages, a studio where authors write and publish books. You do one job on the author's text and return the result.",
    "Match the author's voice, spelling (British or American) and style.",
    aiFormatRule(a),
    `Book: "${book.title}"${book.subtitle ? `: ${book.subtitle}` : ""}.`,
    chapter ? `The chapter "${open!.title}", for context:\n<chapter>\n${chapter}\n</chapter>` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  if (a.needs === "chapter" && !chapter) return json({ error: "This chapter has no text yet." }, 400);
  const target =
    a.needs === "selection"
      ? `<selection>\n${selection}\n</selection>`
      : a.needs === "chapter"
        ? "Work on the whole chapter given above."
        : `The text so far ends:\n<before>\n${before || chapter.slice(-6000)}\n</before>`;

  let stream: ReadableStream<string>;
  try {
    stream = await streamReply(r, system, [{ role: "user", content: `${instruction}\n\n${target}` }], req.signal);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
  const out = stream.pipeThrough(new TextEncoderStream());
  return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Model": encodeURIComponent(`${PROVIDERS[r.provider].label} · ${r.model}`) } });
}
