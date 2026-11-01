import { createHash, createHmac } from "node:crypto";

/**
 * Amazon's Product Advertising API 5.0: the official way to read a book's title, author, cover
 * and every format (Kindle, paperback, hardcover, audiobook) with its price. It needs an Amazon
 * Associates account: AMAZON_PAAPI_ACCESS_KEY, AMAZON_PAAPI_SECRET_KEY and AMAZON_PAAPI_PARTNER_TAG
 * (the store ID, like "jollofpages-20"). Without them the lookup falls back to Google Books and
 * Open Library. We never read Amazon's web pages themselves.
 */
export const paapiConfigured = () => Boolean(process.env.AMAZON_PAAPI_ACCESS_KEY && process.env.AMAZON_PAAPI_SECRET_KEY && process.env.AMAZON_PAAPI_PARTNER_TAG);

const sha256 = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const hmac = (key: Buffer | string, s: string) => createHmac("sha256", key).update(s, "utf8").digest();

/**
 * An AWS Signature Version 4 Authorization header. Headers must include host and x-amz-date
 * (yyyymmddThhmmssZ); every header given is signed.
 */
export function signV4(o: { method: string; path: string; query?: string; headers: Record<string, string>; body: string; region: string; service: string; accessKey: string; secretKey: string }): string {
  const amzDate = o.headers["x-amz-date"];
  const day = amzDate.slice(0, 8);
  const names = Object.keys(o.headers)
    .map((h) => h.toLowerCase())
    .sort();
  const lower = Object.fromEntries(Object.entries(o.headers).map(([k, v]) => [k.toLowerCase(), v.trim().replace(/\s+/g, " ")]));
  const canonical = [o.method, o.path, o.query ?? "", names.map((n) => `${n}:${lower[n]}\n`).join(""), names.join(";"), sha256(o.body)].join("\n");
  const scope = `${day}/${o.region}/${o.service}/aws4_request`;
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonical)].join("\n");
  const key = hmac(hmac(hmac(hmac(`AWS4${o.secretKey}`, day), o.region), o.service), "aws4_request");
  const signature = createHmac("sha256", key).update(toSign, "utf8").digest("hex");
  return `AWS4-HMAC-SHA256 Credential=${o.accessKey}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`;
}

/** The PA-API host and AWS region for an Amazon store. */
export function marketplace(store = "www.amazon.com"): { marketplace: string; host: string; region: string } {
  const tld = store.replace(/^www\./, "").replace(/^amazon\./, "");
  const region = ["co.jp", "com.au", "sg"].includes(tld) ? "us-west-2" : ["com", "ca", "com.mx", "com.br"].includes(tld) ? "us-east-1" : "eu-west-1";
  return { marketplace: `www.amazon.${tld}`, host: `webservices.amazon.${tld}`, region };
}

type Item = {
  ASIN: string;
  DetailPageURL?: string;
  Images?: { Primary?: { Large?: { URL?: string } } };
  ItemInfo?: {
    Title?: { DisplayValue?: string };
    ByLineInfo?: { Contributors?: { Name: string; RoleType?: string; Role?: string }[]; Manufacturer?: { DisplayValue?: string } };
    Classifications?: { Binding?: { DisplayValue?: string } };
    ContentInfo?: { PagesCount?: { DisplayValue?: number }; PublicationDate?: { DisplayValue?: string } };
    ExternalIds?: { ISBNs?: { DisplayValues?: string[] } };
  };
  OffersV2?: { Listings?: { Price?: { Money?: { DisplayAmount?: string } } }[] };
  Offers?: { Listings?: { Price?: { DisplayAmount?: string } }[] };
};

const RESOURCES = [
  "Images.Primary.Large",
  "ItemInfo.Title",
  "ItemInfo.ByLineInfo",
  "ItemInfo.Classifications",
  "ItemInfo.ContentInfo",
  "ItemInfo.ExternalIds",
  "OffersV2.Listings.Price",
];

async function call<T>(op: "GetItems" | "SearchItems", body: Record<string, unknown>, store?: string): Promise<T | null> {
  if (!paapiConfigured()) return null;
  const m = marketplace(store);
  const payload = JSON.stringify({ ...body, PartnerTag: process.env.AMAZON_PAAPI_PARTNER_TAG, PartnerType: "Associates", Marketplace: m.marketplace, Resources: RESOURCES });
  const path = `/paapi5/${op.toLowerCase()}`;
  const headers: Record<string, string> = {
    "content-encoding": "amz-1.0",
    "content-type": "application/json; charset=utf-8",
    host: m.host,
    "x-amz-date": new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""),
    "x-amz-target": `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${op}`,
  };
  const authorization = signV4({ method: "POST", path, headers, body: payload, region: m.region, service: "ProductAdvertisingAPI", accessKey: process.env.AMAZON_PAAPI_ACCESS_KEY!, secretKey: process.env.AMAZON_PAAPI_SECRET_KEY! });
  const res = await fetch(`https://${m.host}${path}`, { method: "POST", headers: { ...headers, authorization }, body: payload, signal: AbortSignal.timeout(10000) }).catch(() => null);
  if (!res) return null;
  const json = (await res.json().catch(() => null)) as T | null;
  if (!res.ok) console.log(`amazon ${op} ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return res.ok ? json : null;
}

export type Format = { label: string; url: string; price: string };

/** "Kindle Edition" → "Kindle"; formats a reader can buy, or "" for ones we don't list. */
export function formatLabel(binding: string): string {
  const b = binding.toLowerCase();
  if (b.includes("kindle")) return "Kindle";
  if (b.includes("audible") || b.includes("audiobook") || b.includes("audio cd")) return "Audiobook";
  if (b.includes("hardcover") || b.includes("hardback")) return "Hardcover";
  if (b.includes("paperback")) return "Paperback";
  return "";
}

/** "Venture Studio Blueprint: Building the Ultimate…" → title and subtitle. Amazon puts both in one field. */
export function splitTitle(full: string): { title: string; subtitle: string } {
  const clean = full.replace(/\s*[([](?:kindle|paperback|hardcover|audiobook)[^)\]]*[)\]]\s*$/i, "").trim();
  const m = clean.match(/^(.+?)\s*[:–—]\s+(.+)$/) ?? clean.match(/^(.+?)\s+-\s+(.+)$/);
  return m ? { title: m[1].trim(), subtitle: m[2].trim() } : { title: clean, subtitle: "" };
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const priceOf = (i: Item) => i.OffersV2?.Listings?.[0]?.Price?.Money?.DisplayAmount || i.Offers?.Listings?.[0]?.Price?.DisplayAmount || "";

export type AmazonBook = {
  asin: string;
  title: string;
  subtitle: string;
  authors: string[];
  cover: string; // image URL on Amazon's image server
  pages: number;
  publishDate: string;
  publisher: string;
  isbn: string;
  formats: Format[];
};

/** Everything Amazon shares about a book by its ASIN (or ISBN-10), with its other formats; null without keys or a match. */
export async function amazonBook(asin: string, store?: string): Promise<AmazonBook | null> {
  const got = await call<{ ItemsResult?: { Items?: Item[] } }>("GetItems", { ItemIds: [asin], ItemIdType: "ASIN" }, store);
  const item = got?.ItemsResult?.Items?.[0];
  const full = item?.ItemInfo?.Title?.DisplayValue;
  if (!item || !full) return null;
  const { title, subtitle } = splitTitle(full);
  const authors = (item.ItemInfo?.ByLineInfo?.Contributors ?? []).filter((c) => !c.RoleType || c.RoleType === "author").map((c) => c.Name);
  const date = item.ItemInfo?.ContentInfo?.PublicationDate?.DisplayValue ?? "";
  const formats: Format[] = [];
  const add = (i: Item) => {
    const label = formatLabel(i.ItemInfo?.Classifications?.Binding?.DisplayValue ?? "");
    if (label && i.DetailPageURL && !formats.some((f) => f.label === label)) formats.push({ label, url: i.DetailPageURL, price: priceOf(i) });
  };
  add(item);
  // the other formats are separate products: find them by title and author
  const found = await call<{ SearchResult?: { Items?: Item[] } }>("SearchItems", { Keywords: `${title} ${authors[0] ?? ""}`.trim(), SearchIndex: "All", ItemCount: 10 }, store);
  for (const i of found?.SearchResult?.Items ?? []) {
    const t = splitTitle(i.ItemInfo?.Title?.DisplayValue ?? "").title;
    const by = (i.ItemInfo?.ByLineInfo?.Contributors ?? []).map((c) => norm(c.Name));
    if (norm(t) === norm(title) && (!authors.length || authors.some((a) => by.includes(norm(a))))) add(i);
  }
  const order = ["Kindle", "Paperback", "Hardcover", "Audiobook"];
  formats.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
  return {
    asin: item.ASIN,
    title,
    subtitle,
    authors,
    cover: item.Images?.Primary?.Large?.URL ?? "",
    pages: item.ItemInfo?.ContentInfo?.PagesCount?.DisplayValue ?? 0,
    publishDate: /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : "",
    publisher: item.ItemInfo?.ByLineInfo?.Manufacturer?.DisplayValue ?? "",
    isbn: item.ItemInfo?.ExternalIds?.ISBNs?.DisplayValues?.[0] ?? "",
    formats,
  };
}
