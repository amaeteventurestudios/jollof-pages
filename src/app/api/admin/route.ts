import { NextResponse } from "next/server";
import { listPrice, loadAdminData, loadInsightData, requireAdmin } from "@/lib/server/admin";
import { needsYou, overview, sinceDate, websites, writers } from "@/lib/admin";
import { canSee, sectionsFor } from "@/lib/admin-roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: who you are on the team, the headline numbers and what is waiting on you.
 * ?check=1 only says whether the caller is on the team (for the Admin link in the menu).
 */
export async function GET(req: Request) {
  const me = await requireAdmin(req);
  if (new URL(req.url).searchParams.has("check")) return NextResponse.json({ admin: "id" in me });
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const data = await loadAdminData();
  const o = overview(data, listPrice());
  const sites = canSee(me.role, "websites") ? websites(data, await loadInsightData(sinceDate(30))) : null;
  return NextResponse.json({
    me: { email: me.email, role: me.role, sections: sectionsFor(me.role) },
    overview: canSee(me.role, "money") ? o : { ...o, money: null },
    needs: needsYou(o, writers(data, listPrice()), sites),
    sites: sites ? { live: sites.filter((s) => !s.offline).length, ownDomain: sites.filter((s) => s.domain === "connected").length, visitors30: sites.reduce((n, s) => n + s.visitors, 0) } : null,
  });
}
