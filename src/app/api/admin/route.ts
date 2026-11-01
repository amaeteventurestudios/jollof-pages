import { NextResponse } from "next/server";
import { listPrice, loadAdminData, loadInsightData, requireAdmin } from "@/lib/server/admin";
import { needsYou, overview, sinceDate, websites, writers } from "@/lib/admin";
import { canSee, sectionsFor } from "@/lib/admin-roles";
import { FLAGS, type FlagKey } from "@/lib/flags";
import { getFlags } from "@/lib/server/flags";

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
  // switches the owner has left off, with what to do before turning them on
  const flags = canSee(me.role, "switches") ? await getFlags() : null;
  const reminders = flags ? (Object.keys(FLAGS) as FlagKey[]).filter((k) => !flags[k]).map((k) => ({ label: FLAGS[k].reminder, href: "/desk/admin/switches" })) : [];
  return NextResponse.json({
    me: { email: me.email, role: me.role, sections: sectionsFor(me.role) },
    overview: canSee(me.role, "money") ? o : { ...o, money: null },
    needs: needsYou(o, writers(data, listPrice()), sites, reminders),
    sites: sites ? { live: sites.filter((s) => !s.offline).length, ownDomain: sites.filter((s) => s.domain === "connected").length, visitors30: sites.reduce((n, s) => n + s.visitors, 0) } : null,
  });
}
