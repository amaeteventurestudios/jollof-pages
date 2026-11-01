import { NextResponse } from "next/server";
import { listPrice, loadAdminData, requireAdmin } from "@/lib/server/admin";
import { overview, payments } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: money totals and every payment, newest first. */
export async function GET(req: Request) {
  const me = await requireAdmin(req, "money");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const data = await loadAdminData();
  return NextResponse.json({ overview: overview(data, listPrice()), payments: payments(data, listPrice()).slice(0, 2000) });
}
