import { caller } from "@/lib/server/credits";
import { resolve, streamReply, type Resolved } from "@/lib/server/assistant";
import { bearer } from "@/lib/server/load-book";
import { serverPb } from "@/lib/pb-server";
import { languageName, parseTranslation, translationPrompt } from "@/lib/translate";
import type { Book } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const json = (body: unknown, status = 200) => Response.json(body, { status });

async function ask(r: Resolved, system: string, user: string): Promise<string> {
  const stream = await streamReply(r, system, [{ role: "user", content: user }]);
  const reader = stream.getReader();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out;
    out += value;
  }
}

/**
 * POST { bookId, language, strings }: translates one batch of a book (paragraphs, headings, notes or
 * the book's details) with the writer's own model, and answers { strings } in the same order. The
 * studio plans the batches and writes the translated copy itself (src/lib/translate.ts).
 */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return json({ error: "Sign in first." }, 401);
  const b = (await req.json().catch(() => ({}))) as { bookId?: string; language?: string; strings?: unknown };
  const strings = Array.isArray(b.strings) ? b.strings.filter((s): s is string => typeof s === "string") : [];
  const language = languageName(String(b.language ?? "").trim()).slice(0, 60);
  if (!language) return json({ error: "Pick a language." }, 400);
  if (!strings.length) return json({ strings: [] });
  if (strings.length > 400 || strings.join("").length > 20000) return json({ error: "Too much text in one go." }, 400);
  const r = await resolve(me);
  if (typeof r === "string") return json({ error: r, setup: true }, 400);
  const book = await serverPb(me.token)
    .collection("books")
    .getOne<Book>(String(b.bookId ?? ""))
    .catch(() => null);
  if (!book || book.owner !== me.id) return json({ error: "This book could not be opened." }, 404);

  const system = translationPrompt(language, book);
  try {
    // a model sometimes miscounts; one more try with a firmer reminder usually fixes it
    for (let attempt = 0; attempt < 2; attempt++) {
      const answer = await ask(r, system, (attempt ? `Return exactly ${strings.length} strings.\n` : "") + JSON.stringify(strings));
      const out = parseTranslation(answer, strings.length);
      if (out) return json({ strings: out });
    }
    return json({ error: "The model's answer could not be read. Try again, or pick a stronger model on the AI assistant page." }, 502);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
}
