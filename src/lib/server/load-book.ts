import "server-only";
import type PocketBase from "pocketbase";
import type { ExportInput } from "../book-model";
import { sortChapters } from "../book-model";
import type { Book, Chapter } from "../types";

/** Loads a book with the caller's token, so PocketBase rules decide access. */
export async function loadExportInput(client: PocketBase, bookId: string): Promise<ExportInput> {
  const book = await client.collection("books").getOne<Book>(bookId, { expand: "author" });
  const chapters = await client.collection("chapters").getFullList<Chapter>({ filter: client.filter("book = {:b}", { b: bookId }) });
  const author = book.expand?.author ?? null;
  let alsoBy: ExportInput["alsoBy"] = [];
  if (author) {
    const others = await client
      .collection("books")
      .getFullList<Book>({ filter: client.filter("author = {:a} && id != {:id} && (published = true || status = 'published')", { a: author.id, id: book.id }) })
      .catch(() => []);
    alsoBy = others.map((b) => ({ title: b.title, subtitle: b.subtitle }));
  }
  return { book, author, chapters: sortChapters(chapters), alsoBy };
}

export function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i) || h.match(/^(.+)$/);
  return m ? m[1].trim() : null;
}
