import { NextResponse } from "next/server";
import { resolveSite } from "@/lib/pb-server";
import { siteKeyOf } from "@/lib/sites";
import { count, firstVisitToday } from "@/lib/server/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Beacon from the public sites: { kind: "view" | "buy_click", path, ref?, store? }. The site is the
 * host the beacon was sent to, so an author site can only count its own visits. Never stores who.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { kind?: string; path?: string; ref?: string; store?: string } | null;
  const ua = req.headers.get("user-agent") || "";
  if (!body || /bot|crawl|spider|preview|headless|lighthouse/i.test(ua)) return new NextResponse(null, { status: 204 });
  const host = req.headers.get("host") || "";
  const site = await resolveSite(siteKeyOf(host) ?? undefined).catch(() => null);
  if (!site?.owner) return new NextResponse(null, { status: 204 });
  if (body.kind === "buy_click") {
    count(site.owner, "buy_click", String(body.store || "Store").slice(0, 60));
    return new NextResponse(null, { status: 204 });
  }
  const path = String(body.path || "/").split("?")[0].slice(0, 200) || "/";
  count(site.owner, "view", path);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  if (firstVisitToday(site.owner, ip, ua)) count(site.owner, "visitor");
  let ref = "";
  try {
    ref = body.ref ? new URL(body.ref).hostname.replace(/^www\./, "") : "";
  } catch {}
  const own = host.split(":")[0].replace(/^www\./, "");
  if (ref && ref !== own && !ref.endsWith("." + own) && !own.endsWith("." + ref)) count(site.owner, "ref", ref);
  return new NextResponse(null, { status: 204 });
}
