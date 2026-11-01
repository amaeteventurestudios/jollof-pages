import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getPublishedBooks, resolveSite } from "@/lib/pb-server";
import { rootDomain, siteKeyOf } from "@/lib/sites";

export const revalidate = 3600;

/** The publisher's pages and books on the root domain; on an author's site, that author's books. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("x-forwarded-host") || (await headers()).get("host") || rootDomain();
  const key = siteKeyOf(host);
  const origin = key ? `https://${host.split(":")[0]}` : `https://${rootDomain()}`;
  const site = key ? await resolveSite(key) : null;
  if (key && !site) return [];
  const books = await getPublishedBooks(site?.owner);
  const pages: MetadataRoute.Sitemap = key
    ? [
        { url: origin, changeFrequency: "weekly", priority: 1 },
        { url: `${origin}/books`, changeFrequency: "weekly", priority: 0.8 },
      ]
    : [
        { url: origin, changeFrequency: "weekly", priority: 1, images: [`${origin}/og/jollof-pages.jpg`] },
        { url: `${origin}/books`, changeFrequency: "weekly", priority: 0.7 },
        { url: `${origin}/help`, changeFrequency: "monthly", priority: 0.6 },
        { url: `${origin}/contact`, changeFrequency: "yearly", priority: 0.5 },
        { url: `${origin}/signup`, changeFrequency: "monthly", priority: 0.5 },
        { url: `${origin}/privacy`, changeFrequency: "yearly", priority: 0.2 },
        { url: `${origin}/terms`, changeFrequency: "yearly", priority: 0.2 },
      ];
  return [...pages, ...books.map((b) => ({ url: `${origin}/books/${b.slug}`, lastModified: b.updated, changeFrequency: "monthly" as const, priority: 0.6 }))];
}
