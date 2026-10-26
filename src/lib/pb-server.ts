import "server-only";
import PocketBase from "pocketbase";
import type { Author, Book, Chapter, SiteSettings } from "./types";
import { PB_URL } from "./pb";

/** Server-side reads for the public site. PocketBase rules decide what is public. */
export function serverPb(token?: string): PocketBase {
  const internal = (process.env.POCKETBASE_INTERNAL_URL || PB_URL).replace(/\/$/, "");
  const client = new PocketBase(internal);
  client.autoCancellation(false);
  if (token) client.authStore.save(token, null);
  return client;
}

export async function getSite(): Promise<SiteSettings | null> {
  try {
    const list = await serverPb().collection("site_settings").getList<SiteSettings>(1, 1, { sort: "created" });
    return list.items[0] ?? null;
  } catch {
    return null;
  }
}

export async function getPublishedBooks(): Promise<Book[]> {
  try {
    return await serverPb()
      .collection("books")
      .getFullList<Book>({ filter: "published = true", sort: "-featured,-publication_date,-created", expand: "author" });
  } catch {
    return [];
  }
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  try {
    return await serverPb()
      .collection("books")
      .getFirstListItem<Book>(serverPb().filter("published = true && slug = {:slug}", { slug }), { expand: "author" });
  } catch {
    return null;
  }
}

export async function getSampleChapter(bookId: string): Promise<Chapter | null> {
  try {
    const list = await serverPb()
      .collection("chapters")
      .getList<Chapter>(1, 1, { filter: serverPb().filter("book = {:b} && is_sample = true", { b: bookId }), sort: "section,order" });
    return list.items[0] ?? null;
  } catch {
    return null;
  }
}

export async function getAuthors(): Promise<Author[]> {
  try {
    return await serverPb().collection("authors").getFullList<Author>({ sort: "name" });
  } catch {
    return [];
  }
}
