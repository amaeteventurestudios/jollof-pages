"use client";

import { pb } from "./pb";
import { sortChapters, type ExportInput } from "./book-model";
import { countWords, collectImages, type DocNode } from "./doc/types";
import { defaultContent, elementKind, STARTER_ELEMENTS } from "./elements";
import { slugify, today } from "./slug";
import { DEFAULT_FORMAT, DEFAULT_GOAL, type Author, type Book, type Chapter, type Section, type SiteSettings, type WritingLog } from "./types";
import type { BinaryAsset } from "./export/epub";

export function userId(): string {
  const id = pb().authStore.record?.id;
  if (!id) throw new Error("Not signed in");
  return id;
}

export async function listBooks(): Promise<Book[]> {
  return pb().collection("books").getFullList<Book>({ filter: pb().filter("owner = {:u}", { u: userId() }), sort: "-updated", expand: "author" });
}

export async function listAuthors(): Promise<Author[]> {
  return pb().collection("authors").getFullList<Author>({ filter: pb().filter("owner = {:u}", { u: userId() }), sort: "name" });
}

export async function ensureAuthor(id?: string): Promise<Author> {
  const existing = await listAuthors();
  const chosen = existing.find((a) => a.id === id) ?? existing[0];
  if (chosen) return chosen;
  // no pen names yet: a placeholder the owner renames on the Pen names page
  const name = "New pen name";
  return pb().collection("authors").create<Author>({ owner: userId(), name, slug: await uniqueSlug("authors", slugify(name)) });
}

export async function uniqueSlug(collection: string, base: string, exceptId?: string): Promise<string> {
  let slug = base || "item";
  for (let i = 2; i < 50; i++) {
    const hits = await pb()
      .collection(collection)
      // addresses are unique per account: other authors may use the same one on their own sites
      .getList(1, 1, { filter: pb().filter("owner = {:u} && slug = {:s}" + (exceptId ? " && id != {:id}" : ""), { u: userId(), s: slug, id: exceptId ?? "" }) })
      .catch(() => ({ totalItems: 0 }));
    if (!hits.totalItems) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  // every author's site settings are public, so ask for this account's own
  const list = await pb().collection("site_settings").getList<SiteSettings>(1, 1, { filter: pb().filter("owner = {:u}", { u: userId() }), sort: "created" });
  return list.items[0] ?? null;
}

export async function createBook(input: { title: string; subtitle?: string; author?: string; withStarter?: boolean }): Promise<Book> {
  const author = await ensureAuthor(input.author);
  const site = await getSiteSettings().catch(() => null);
  const book = await pb()
    .collection("books")
    .create<Book>({
      owner: userId(),
      title: input.title,
      subtitle: input.subtitle ?? "",
      slug: await uniqueSlug("books", slugify(input.title)),
      author: author.id,
      status: "drafting",
      language: "en",
      imprint: site?.publisher_name || "Jollof Pages",
      format: DEFAULT_FORMAT,
      goal: DEFAULT_GOAL,
      keywords: [],
      categories: [],
      buy_links: [],
      praise: [],
      reviews: [],
      published: false,
    });
  if (input.withStarter !== false) {
    const counters: Record<Section, number> = { front: 0, body: 0, back: 0 };
    for (const el of STARTER_ELEMENTS) {
      const kind = elementKind(el.kind);
      await createChapter(book, { kind: el.kind, title: el.title, order: counters[kind.section]++, authorBio: author.bio, authorName: author.name });
    }
  }
  return book;
}

export async function createChapter(
  book: Book,
  o: { kind: string; title?: string; order: number; content?: DocNode; authorBio?: string; authorName?: string },
): Promise<Chapter> {
  const kind = elementKind(o.kind);
  const content =
    o.content ??
    defaultContent(o.kind, {
      title: book.title,
      author: o.authorName || book.expand?.author?.name || "",
      year: new Date().getFullYear(),
      imprint: book.imprint || "Jollof Pages",
      isbnEbook: book.isbn_ebook,
      isbnPaperback: book.isbn_paperback,
      authorBio: o.authorBio ?? book.expand?.author?.bio,
    });
  return pb()
    .collection("chapters")
    .create<Chapter>({
      owner: userId(),
      book: book.id,
      kind: kind.id,
      section: kind.section,
      title: o.title ?? kind.label,
      order: o.order,
      content,
      word_count: countWords(content),
      status: "draft",
      in_toc: kind.inToc,
      numbered: kind.numbered,
      is_sample: false,
    });
}

export async function loadBook(id: string): Promise<{ book: Book; chapters: Chapter[] }> {
  const [book, chapters] = await Promise.all([
    pb().collection("books").getOne<Book>(id, { expand: "author" }),
    pb().collection("chapters").getFullList<Chapter>({ filter: pb().filter("book = {:b}", { b: id }), sort: "section,order" }),
  ]);
  return { book, chapters: sortChapters(chapters) };
}

export async function updateBook(id: string, data: Partial<Book>): Promise<Book> {
  return pb().collection("books").update<Book>(id, data, { expand: "author" });
}

/** Add today's net words to the writing log (one row per book per day). */
export async function logWords(bookId: string, delta: number, minutes = 0): Promise<void> {
  if (!delta && !minutes) return;
  const date = today();
  const col = pb().collection("writing_log");
  try {
    const row = await col.getFirstListItem<WritingLog & { minutes: number }>(pb().filter("book = {:b} && date = {:d}", { b: bookId, d: date }));
    await col.update(row.id, { words: (row.words || 0) + delta, minutes: (row.minutes || 0) + minutes });
  } catch {
    await col.create({ owner: userId(), book: bookId, date, words: delta, minutes }).catch(() => undefined);
  }
}

export async function loadLogs(sinceDays = 90, bookId?: string): Promise<WritingLog[]> {
  const since = today(new Date(Date.now() - sinceDays * 86400000));
  const filter = bookId ? pb().filter("date >= {:s} && book = {:b}", { s: since, b: bookId }) : pb().filter("date >= {:s}", { s: since });
  return pb().collection("writing_log").getFullList<WritingLog>({ filter, sort: "date" });
}

export async function saveChapter(ch: Chapter, patch: Partial<Chapter>): Promise<Chapter> {
  return pb().collection("chapters").update<Chapter>(ch.id, patch);
}

export async function refreshBookWordCount(bookId: string, chapters: Chapter[]): Promise<number> {
  const total = chapters.reduce((s, c) => s + (c.word_count || 0), 0);
  await pb().collection("books").update(bookId, { word_count: total }).catch(() => undefined);
  return total;
}

export async function exportInput(bookId: string): Promise<ExportInput> {
  const { book, chapters } = await loadBook(bookId);
  const author = book.expand?.author ?? null;
  let alsoBy: ExportInput["alsoBy"] = [];
  if (author) {
    const others = await pb()
      .collection("books")
      .getFullList<Book>({ filter: pb().filter("author = {:a} && id != {:id} && (published = true || status = 'published')", { a: author.id, id: book.id }), sort: "-publication_date" })
      .catch(() => []);
    alsoBy = others.map((b) => ({ title: b.title, subtitle: b.subtitle }));
  }
  return { book, author, chapters, alsoBy };
}

async function fetchBinary(url: string): Promise<BinaryAsset | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
    return { bytes: new Uint8Array(await res.arrayBuffer()), mediaType: type };
  } catch {
    return null;
  }
}

export async function fetchImages(input: ExportInput): Promise<Map<string, BinaryAsset>> {
  const out = new Map<string, BinaryAsset>();
  const srcs = new Set(input.chapters.flatMap((c) => collectImages(c.content)));
  for (const src of srcs) {
    const bin = await fetchBinary(src);
    if (bin) out.set(src, bin);
  }
  return out;
}

export async function fetchCover(book: Book): Promise<BinaryAsset | null> {
  if (!book.cover) return null;
  const { fileUrl } = await import("./pb");
  return fetchBinary(fileUrl(book, book.cover));
}

export function download(bytes: Uint8Array | Blob, filename: string, type = "application/octet-stream") {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes as BlobPart], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
