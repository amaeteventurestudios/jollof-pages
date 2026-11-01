/**
 * Amazon Associates: every Amazon buy button carries a store tag, so a reader's purchase earns a
 * commission. A writer's own tag (site_settings.amazon_tag) wins; otherwise Jollof Pages' own
 * (AMAZON_ASSOCIATE_TAG). Amazon requires a disclosure wherever tagged links appear: AMAZON_DISCLOSURE.
 */
export const AMAZON_DISCLOSURE = "As an Amazon Associate, Jollof Pages earns from qualifying purchases.";

/** A store tag looks like "sevenfc-20": letters, digits and dashes. */
export const validTag = (t: string) => /^[A-Za-z0-9-]{3,40}$/.test(t.trim());

export function amazonTag(site?: { amazon_tag?: string } | null): string {
  const own = (site?.amazon_tag ?? "").trim();
  if (own && validTag(own)) return own;
  const house = (process.env.AMAZON_ASSOCIATE_TAG ?? "").trim();
  return validTag(house) ? house : "";
}

/** Is this a reader-facing Amazon store page (not KDP, Audible or another Amazon site)? */
export function isAmazonStore(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return /^(www\.|smile\.)?amazon\.[a-z.]{2,6}$/.test(h) || h === "amzn.to" || h === "a.co";
  } catch {
    return false;
  }
}

/** The link with the store tag set; other links, short links and empty tags come back unchanged. */
export function withAmazonTag(url: string, tag: string): string {
  if (!tag || !isAmazonStore(url)) return url;
  const u = new URL(url);
  if (u.hostname === "amzn.to" || u.hostname === "a.co") return url; // short links carry their own tag
  u.searchParams.set("tag", tag);
  return u.toString();
}

/** Tags every Amazon link in a book's buy list; `tagged` says whether the disclosure is needed. */
export function tagBuyLinks<T extends { url: string }>(links: T[], tag: string): { links: T[]; tagged: boolean } {
  let tagged = false;
  const out = links.map((l) => {
    const url = withAmazonTag(l.url, tag);
    if (url !== l.url || (tag && isAmazonStore(l.url) && new URL(l.url).searchParams.get("tag") === tag)) tagged = true;
    return { ...l, url };
  });
  return { links: out, tagged };
}
