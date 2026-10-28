import { NextResponse } from "next/server";
import { addLedger, adminPb } from "@/lib/server/credits";
import { listPrice, loadAdminData, requireAdmin } from "@/lib/server/admin";
import { writers } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: every writer with their books, last activity, site, plan and credits. */
export async function GET(req: Request) {
  const me = await requireAdmin(req);
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  return NextResponse.json({ writers: writers(await loadAdminData(), listPrice()) });
}

/**
 * POST { id, action }: "comp" opens the studio for free, "pending" closes it again (paid accounts
 * stay paid), and "grant" with { credits, note } adds AI cover credits.
 */
export async function POST(req: Request) {
  const me = await requireAdmin(req);
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const b = (await req.json().catch(() => ({}))) as { id?: string; action?: string; credits?: number; note?: string };
  const pb = await adminPb();
  const user = await pb
    .collection("users")
    .getOne(String(b.id ?? ""))
    .catch(() => null);
  if (!user) return NextResponse.json({ error: "No such writer." }, { status: 404 });
  if (b.action === "comp" || b.action === "pending") {
    if (user.access === "paid") return NextResponse.json({ error: "This writer paid for the studio, so their access stays open." }, { status: 400 });
    await pb.collection("users").update(user.id, { access: b.action });
  } else if (b.action === "grant") {
    const credits = Math.round(Number(b.credits));
    if (!credits || Math.abs(credits) > 10000) return NextResponse.json({ error: "Give a number of credits between 1 and 10,000 (negative takes credits away)." }, { status: 400 });
    await addLedger({ owner: user.id, delta: credits, reason: "grant", note: String(b.note ?? `Granted by ${me.email}`).slice(0, 500) });
  } else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const row = writers(await loadAdminData(), listPrice()).find((w) => w.id === user.id);
  return NextResponse.json({ writer: row });
}
