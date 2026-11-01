import { resolve4 } from "node:dns/promises";
import { NextResponse } from "next/server";
import { adminPb } from "@/lib/server/credits";
import { audit, loadAdminData, loadInsightData, requireAdmin } from "@/lib/server/admin";
import { sinceDate, toRange, websites } from "@/lib/admin";
import { rootDomain, siteLabel } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?days=: every author website with its visitors over the range. */
export async function GET(req: Request) {
  const me = await requireAdmin(req, "websites");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const range = toRange(new URL(req.url).searchParams.get("days"));
  const [data, x] = await Promise.all([loadAdminData(), loadInsightData(sinceDate(range))]);
  return NextResponse.json({ sites: websites(data, x), root: rootDomain() });
}

async function serverIps(): Promise<string[]> {
  if (process.env.SERVER_IP) return [process.env.SERVER_IP];
  return resolve4(rootDomain()).catch(() => []);
}

/**
 * POST { id, action }: "offline" takes a site down (it answers as not found), "online" puts it
 * back, "check" looks up where its own domain points right now.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string; action?: string };
  const me = await requireAdmin(req, b.action === "check" ? "websites" : "site.offline");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const pb = await adminPb();
  const site = await pb
    .collection("site_settings")
    .getOne<{ id: string; owner: string; subdomain?: string; custom_domain?: string; home?: boolean }>(String(b.id ?? ""))
    .catch(() => null);
  if (!site) return NextResponse.json({ error: "No such site." }, { status: 404 });
  if (b.action === "check") {
    const domain =
      site.custom_domain ||
      (
        await pb
          .collection("domains")
          .getFirstListItem<{ domain: string }>(pb.filter("owner = {:o}", { o: site.owner }), { sort: "-updated" })
          .catch(() => null)
      )?.domain;
    if (!domain) return NextResponse.json({ check: { domain: "", ok: false, note: "This site has no own domain." } });
    const [found, expected] = await Promise.all([resolve4(domain).catch(() => [] as string[]), serverIps()]);
    const ok = found.some((ip) => expected.includes(ip));
    const note = !found.length
      ? `${domain} has no A record yet. The writer needs to add one pointing to ${expected[0] ?? "this server"}.`
      : ok
        ? `${domain} points here (${found.join(", ")}).`
        : `${domain} points to ${found.join(", ")}, not this server (${expected.join(", ") || "unknown"}).`;
    return NextResponse.json({ check: { domain, ok, note } });
  }
  if (b.action !== "offline" && b.action !== "online") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  if (site.home) return NextResponse.json({ error: "That's the jollofpages.com site itself; it can't be taken offline here." }, { status: 400 });
  await pb.collection("site_settings").update(site.id, { offline: b.action === "offline" });
  await audit(me, b.action === "offline" ? "site.offline" : "site.online", { id: site.id, label: siteLabel(site) });
  return NextResponse.json({ ok: true });
}
