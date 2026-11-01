import "server-only";
import PocketBase from "pocketbase";
import type { Author, Book, Chapter, SiteSettings } from "./types";
import { PB_URL } from "./pb";
import { hasPro } from "./sites";

/** Server-side reads for the public site. PocketBase rules decide what is public. */
export function serverPb(token?: string): PocketBase {
  const internal = (process.env.POCKETBASE_INTERNAL_URL || PB_URL).replace(/\/$/, "");
  const client = new PocketBase(internal);
  client.autoCancellation(false);
  if (token) client.authStore.save(token, null);
  return client;
}

/** The publisher's own site, served at the root domain. */
export async function getSite(): Promise<SiteSettings | null> {
  const col = serverPb().collection("site_settings");
  try {
    const home = await col.getList<SiteSettings>(1, 1, { filter: "home = true", sort: "created" });
    if (home.items[0]) return home.items[0];
  } catch {
    // before the author-accounts migration there is no `home` field
  }
  try {
    const list = await col.getList<SiteSettings>(1, 1, { sort: "created" });
    return list.items[0] ?? null;
  } catch {
    return null;
  }
}

/** An author's site by its subdomain (ada for ada.jollofpages.com). Sites the admin took offline answer as missing. */
export async function getSiteBySubdomain(sub: string): Promise<SiteSettings | null> {
  try {
    return await serverPb()
      .collection("site_settings")
      .getFirstListItem<SiteSettings>(serverPb().filter("subdomain = {:s} && offline != true && paused != true", { s: sub.toLowerCase() }));
  } catch {
    return null;
  }
}

/** An author's site by the domain they connected (adaokafor.com). */
export async function getSiteByDomain(domain: string): Promise<SiteSettings | null> {
  try {
    const site = await serverPb()
      .collection("site_settings")
      .getFirstListItem<SiteSettings>(serverPb().filter("custom_domain = {:d} && offline != true && paused != true", { d: domain.toLowerCase() }));
    // an own domain answers only while Author Site Pro is paid up
    return hasPro(site) ? site : null;
  } catch {
    return null;
  }
}

/**
 * A site its author turned off for now (not one an admin took down), so its home page can show a
 * short resting note instead of "not found". Returns the name to show, or null.
 */
export async function pausedSiteName(key?: string): Promise<string | null> {
  if (!key) return null;
  const k = decodeURIComponent(key).toLowerCase();
  try {
    const site = await serverPb()
      .collection("site_settings")
      .getFirstListItem<SiteSettings>(serverPb().filter(k.includes(".") ? "custom_domain = {:k}" : "subdomain = {:k}", { k }) + " && paused = true && offline != true");
    return site.publisher_name || k;
  } catch {
    return null;
  }
}

/**
 * The site a page belongs to. `key` is what the proxy put in /sites/[site]: a subdomain ("ada"),
 * an author's own domain ("adaokafor.com", which has a dot), or nothing for the publisher's site.
 */
export async function resolveSite(key?: string): Promise<SiteSettings | null> {
  if (!key) return getSite();
  const k = decodeURIComponent(key).toLowerCase();
  return k.includes(".") ? getSiteByDomain(k) : getSiteBySubdomain(k);
}

/** Whose books a page shows: the given owner, else the publisher's own. */
async function ownerOrHome(owner?: string): Promise<string> {
  if (owner) return owner;
  return (await getSite())?.owner ?? "";
}

export async function getPublishedBooks(owner?: string): Promise<Book[]> {
  try {
    const o = await ownerOrHome(owner);
    const filter = o ? serverPb().filter("published = true && owner = {:o}", { o }) : "published = true";
    return await serverPb().collection("books").getFullList<Book>({ filter, sort: "-featured,-publication_date,-created", expand: "author" });
  } catch {
    return [];
  }
}

export async function getBookBySlug(slug: string, owner?: string): Promise<Book | null> {
  try {
    const o = await ownerOrHome(owner);
    const filter = o ? serverPb().filter("published = true && slug = {:slug} && owner = {:o}", { slug, o }) : serverPb().filter("published = true && slug = {:slug}", { slug });
    return await serverPb().collection("books").getFirstListItem<Book>(filter, { expand: "author" });
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

export async function getAuthors(owner?: string): Promise<Author[]> {
  try {
    const o = await ownerOrHome(owner);
    return await serverPb()
      .collection("authors")
      .getFullList<Author>({ sort: "name", ...(o ? { filter: serverPb().filter("owner = {:o}", { o }) } : {}) });
  } catch {
    return [];
  }
}

/** A published book on a site: an author's site when `sub` is given, else the publisher's. */
export async function getSiteBook(slug: string, sub?: string): Promise<{ site: SiteSettings | null; book: Book | null }> {
  const site = await resolveSite(sub);
  if (sub && !site) return { site, book: null };
  return { site, book: await getBookBySlug(slug, site?.owner) };
}
