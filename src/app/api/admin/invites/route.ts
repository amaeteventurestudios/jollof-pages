import { NextResponse } from "next/server";
import { adminPb } from "@/lib/server/credits";
import { audit, listPrice, loadAdminData, requireAdmin } from "@/lib/server/admin";
import { publicOrigin } from "@/lib/server/origin";
import { writers } from "@/lib/admin";
import { expiryFor, inviteState, inviteUrl, newInviteCode, type TesterInvite } from "@/lib/invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function listAll(req: Request) {
  const pb = await adminPb();
  const [invites, data] = await Promise.all([pb.collection("tester_invites").getFullList<TesterInvite>({ sort: "-created" }), loadAdminData()]);
  const testers = writers(data, listPrice()).filter((w) => w.tester);
  const origin = publicOrigin(req);
  return { invites: invites.map((i) => ({ ...i, url: inviteUrl(origin, i.code), state: inviteState(i) })), testers };
}

/** GET: every tester invite link, and every writer who joined through one. */
export async function GET(req: Request) {
  const me = await requireAdmin(req, "testers");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  try {
    return NextResponse.json(await listAll(req));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

/**
 * POST { action: "create", label, max_uses, days, credits } makes a new link.
 * POST { action: "revoke" | "restore", id } switches a link off or back on. Testers who already
 * joined keep their access; take it back one by one on the Writers tab.
 */
export async function POST(req: Request) {
  const me = await requireAdmin(req, "testers.manage");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const b = (await req.json().catch(() => ({}))) as { action?: string; id?: string; label?: string; max_uses?: number; days?: number; credits?: number };
  try {
    const pb = await adminPb();
    if (b.action === "create") {
      const max = Math.max(0, Math.round(Number(b.max_uses) || 0));
      const credits = Math.max(0, Math.round(Number(b.credits) || 0));
      if (max > 100000) return NextResponse.json({ error: "Pick up to 100,000 people, or leave it empty for no limit." }, { status: 400 });
      if (credits > 10000) return NextResponse.json({ error: "Give up to 10,000 AI credits per tester." }, { status: 400 });
      const label = String(b.label ?? "")
        .trim()
        .slice(0, 120);
      await audit(me, "testers.create", { label: label || "Tester link" }, `${max || "no limit"} people, ${credits} credits each`);
      await pb.collection("tester_invites").create({
        code: newInviteCode(),
        label: String(b.label ?? "")
          .trim()
          .slice(0, 120),
        max_uses: max,
        uses: 0,
        expires: expiryFor(Math.round(Number(b.days) || 0)),
        revoked: false,
        credits,
        created_by: me.email,
      });
    } else if (b.action === "revoke" || b.action === "restore") {
      const row = await pb.collection("tester_invites").update<TesterInvite>(String(b.id ?? ""), { revoked: b.action === "revoke" });
      await audit(me, b.action === "revoke" ? "testers.revoke" : "testers.restore", { id: row.id, label: row.label || "Tester link" });
    } else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    return NextResponse.json(await listAll(req));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
