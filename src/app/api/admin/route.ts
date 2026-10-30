import { NextResponse } from "next/server";
import { listPrice, loadAdminData, requireAdmin } from "@/lib/server/admin";
import { overview, payments } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: the owner's dashboard numbers and every payment. ?check=1 only says whether the caller is the owner. */
export async function GET(req: Request) {
  const me = await requireAdmin(req);
  if (new URL(req.url).searchParams.has("check")) return NextResponse.json({ admin: "id" in me });
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const data = await loadAdminData();
  return NextResponse.json({ overview: overview(data, listPrice()), payments: payments(data, listPrice()).slice(0, 500) });
}
