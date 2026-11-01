import { resolve4 } from "node:dns/promises";
import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { adminPb, caller } from "@/lib/server/credits";
import { subdomainAvailability } from "@/lib/server/accounts";
import { domainProblem, hasPro, normalizeDomain, rootDomain } from "@/lib/sites";
import type { SiteSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { subdomain } changes an author's jollofpages.com address.
 * POST { custom_domain } connects a domain they own once its DNS points at this server
 * ("" disconnects it). Only the server may write these fields.
 */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { subdomain?: string; custom_domain?: string };

  try {
    const pb = await adminPb();
    const site = await pb
      .collection("site_settings")
      .getFirstListItem<SiteSettings>(pb.filter("owner = {:o}", { o: me.id }))
      .catch(() => null);
    if (!site) return NextResponse.json({ error: "Your account has no site yet." }, { status: 404 });
    if (site.home) return NextResponse.json({ error: "The publisher site lives at the main domain and has no other address." }, { status: 400 });

    if (typeof body.subdomain === "string") {
      const sub = body.subdomain.trim().toLowerCase();
      if (sub === site.subdomain) return NextResponse.json({ site });
      const problem = await subdomainAvailability(sub, me.id);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      return NextResponse.json({ site: await pb.collection("site_settings").update(site.id, { subdomain: sub }) });
    }

    if (typeof body.custom_domain === "string") {
      const domain = normalizeDomain(body.custom_domain);
      if (!domain) return NextResponse.json({ site: await pb.collection("site_settings").update(site.id, { custom_domain: "" }) });
      if (!hasPro(site)) return NextResponse.json({ error: "Your own domain comes with Author Site Pro." }, { status: 402 });
      const problem = domainProblem(domain);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      const clash = await pb
        .collection("site_settings")
        .getList(1, 1, { filter: pb.filter("custom_domain = {:d} && id != {:id}", { d: domain, id: site.id }) });
      if (clash.totalItems) return NextResponse.json({ error: "That domain is connected to another site." }, { status: 400 });
      // the domain must already point here, which also shows the author controls it
      const [ours, theirs] = await Promise.all([resolve4(rootDomain()).catch(() => [] as string[]), resolve4(domain).catch(() => [] as string[])]);
      if (!theirs.length || !theirs.some((ip) => ours.includes(ip)))
        return NextResponse.json(
          { error: `${domain} does not point to us yet. Add an A record for it with the value ${ours[0] ?? "shown in the Desk"}, wait a few minutes and try again.`, ip: ours[0] ?? "" },
          { status: 400 },
        );
      return NextResponse.json({ site: await pb.collection("site_settings").update(site.id, { custom_domain: domain }) });
    }
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

/** GET → { ip, root }: what an author's DNS record should point at. */
export async function GET() {
  const ip = (await resolve4(rootDomain()).catch(() => [] as string[]))[0] ?? "";
  return NextResponse.json({ ip, root: rootDomain() });
}
