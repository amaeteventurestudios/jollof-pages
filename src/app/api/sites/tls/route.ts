import { NextResponse } from "next/server";
import { getSiteByDomain, getSiteBySubdomain } from "@/lib/pb-server";
import { normalizeDomain, rootDomain, subdomainOf } from "@/lib/sites";
import { activeBrands, brandFor } from "@/lib/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Caddy's on-demand TLS asks here before it fetches a certificate: GET ?domain=ada.jollofpages.com.
 * 200 means the name belongs to an author site or a brand's domain, so certificates are only made for real sites.
 */
export async function GET(req: Request) {
  const raw = (new URL(req.url).searchParams.get("domain") || "").toLowerCase();
  const brand = brandFor(raw, await activeBrands());
  const root = brand?.domain ?? rootDomain();
  let ok = false;
  if (raw === root || raw === `www.${root}`) ok = true;
  else if (raw.endsWith("." + root)) {
    const sub = subdomainOf(raw, root);
    ok = !!sub && !!(await getSiteBySubdomain(sub));
  } else {
    const domain = normalizeDomain(raw);
    ok = !!domain && !!(await getSiteByDomain(domain));
  }
  return new NextResponse(ok ? "ok" : "unknown", { status: ok ? 200 : 404 });
}
