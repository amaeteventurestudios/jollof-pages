import { NextResponse } from "next/server";
import { loadAdminData, loadInsightData, requireAdmin } from "@/lib/server/admin";
import { insights, sinceDate, toRange } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?days=7|30|90|365|0: what's being written and done on the platform, as counts only. */
export async function GET(req: Request) {
  const me = await requireAdmin(req, "insights");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const range = toRange(new URL(req.url).searchParams.get("days"));
  const [data, x] = await Promise.all([loadAdminData(), loadInsightData(sinceDate(range))]);
  return NextResponse.json({ insights: insights(data, x, range) });
}
