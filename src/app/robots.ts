import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { rootDomain, siteKeyOf } from "@/lib/sites";

/** The studio's own address keeps sign-in and the studio out of search; author sites list everything. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("x-forwarded-host") || (await headers()).get("host") || rootDomain();
  const key = siteKeyOf(host);
  const origin = key ? `https://${host.split(":")[0]}` : `https://${rootDomain()}`;
  return {
    rules: { userAgent: "*", allow: "/", disallow: key ? ["/api/"] : ["/studio", "/api/", "/invite", "/unsubscribe", "/sites/"] },
    sitemap: `${origin}/sitemap.xml`,
  };
}
