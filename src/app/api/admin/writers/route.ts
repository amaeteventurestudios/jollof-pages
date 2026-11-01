import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { addLedger, adminPb } from "@/lib/server/credits";
import { audit, isOwner, listPrice, loadAdminData, requireAdmin } from "@/lib/server/admin";
import { writers } from "@/lib/admin";
import { can, SUPPORT_CREDIT_LIMIT, type Action } from "@/lib/admin-roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: every writer with their books, words, last activity, site, plan, credits and spam signs. */
export async function GET(req: Request) {
  const me = await requireAdmin(req, "writers");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  return NextResponse.json({ writers: writers(await loadAdminData(), listPrice()) });
}

const NEEDS: Record<string, Action> = {
  comp: "writer.access",
  pending: "writer.access",
  grant: "writer.credits",
  password: "writer.password",
  suspend: "writer.suspend",
  unsuspend: "writer.suspend",
  delete: "writer.delete",
  apps: "writer.apps",
};

const APPS = { studio: "Jollof Studio", aiWriter: "AI writer" } as const;

/** A password that reads out over the phone: three short words of letters and a number. */
function tempPassword(): string {
  const abc = "abcdefghjkmnpqrstuvwxyz";
  const part = () => Array.from({ length: 4 }, () => abc[randomInt(abc.length)]).join("");
  return `${part()}-${part()}-${part()}-${randomInt(10, 99)}`;
}

/**
 * POST { id, action }:
 * - "comp" opens the Desk for free, "pending" closes it again (paid accounts stay paid)
 * - "grant" with { credits, note } adds AI cover credits (support: up to 100 at a time)
 * - "password" sets a temporary password and returns it once, to pass on to the writer
 * - "suspend" with { reason } stops them signing in and takes their site offline; "unsuspend" undoes it
 * - "delete" with { confirm: their email } removes the account and everything in it. Owner only.
 * - "apps" with { app: "studio" | "aiWriter", on } switches Jollof Studio or the AI writer for them
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { id?: string; action?: string; credits?: number; note?: string; reason?: string; confirm?: string; app?: string; on?: boolean };
  const need = NEEDS[b.action ?? ""];
  if (!need) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const me = await requireAdmin(req, need);
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const pb = await adminPb();
  const user = await pb
    .collection("users")
    .getOne<{ id: string; email: string; access?: string }>(String(b.id ?? ""))
    .catch(() => null);
  if (!user) return NextResponse.json({ error: "No such writer." }, { status: 404 });
  const target = { id: user.id, label: user.email };
  const site = () =>
    pb
      .collection("site_settings")
      .getFirstListItem<{ id: string; home?: boolean }>(pb.filter("owner = {:o}", { o: user.id }))
      .catch(() => null);
  if ((b.action === "suspend" || b.action === "delete") && (isOwner(user.email) || user.id === me.id)) return NextResponse.json({ error: "You can't do that to an owner account." }, { status: 400 });
  let extra: Record<string, unknown> = {};

  if (b.action === "comp" || b.action === "pending") {
    if (user.access === "paid") return NextResponse.json({ error: "This writer paid for the Desk, so their access stays open." }, { status: 400 });
    await pb.collection("users").update(user.id, { access: b.action });
    await audit(me, b.action === "comp" ? "writer.comp" : "writer.uncomp", target);
  } else if (b.action === "grant") {
    const credits = Math.round(Number(b.credits));
    const cap = can(me.role, "writer.access") ? 10000 : SUPPORT_CREDIT_LIMIT;
    if (!credits || Math.abs(credits) > cap) return NextResponse.json({ error: `Give a number of credits between 1 and ${cap.toLocaleString()} (negative takes credits away).` }, { status: 400 });
    await addLedger({ owner: user.id, delta: credits, reason: "grant", note: String(b.note || `Granted by ${me.email}`).slice(0, 500) });
    await audit(me, "writer.credits", target, `${credits > 0 ? "+" : ""}${credits} credits`);
  } else if (b.action === "password") {
    const password = tempPassword();
    await pb.collection("users").update(user.id, { password, passwordConfirm: password });
    await audit(me, "writer.password", target, "Set a temporary password");
    extra = { password };
  } else if (b.action === "suspend") {
    await pb.collection("users").update(user.id, { suspended: true, suspended_reason: String(b.reason ?? "").slice(0, 300) });
    const s = await site();
    if (s && !s.home) await pb.collection("site_settings").update(s.id, { offline: true });
    await audit(me, "writer.suspend", target, String(b.reason ?? ""));
  } else if (b.action === "unsuspend") {
    await pb.collection("users").update(user.id, { suspended: false, suspended_reason: "" });
    const s = await site();
    if (s) await pb.collection("site_settings").update(s.id, { offline: false });
    await audit(me, "writer.unsuspend", target);
  } else if (b.action === "apps") {
    if (b.app !== "studio" && b.app !== "aiWriter") return NextResponse.json({ error: "Unknown app." }, { status: 400 });
    const on = Boolean(b.on);
    await pb.collection("users").update(user.id, b.app === "studio" ? { studio_off: !on } : { ai_writer: on });
    await audit(me, on ? "writer.app_on" : "writer.app_off", target, APPS[b.app]);
  } else if (b.action === "delete") {
    if (
      String(b.confirm ?? "")
        .trim()
        .toLowerCase() !== user.email.toLowerCase()
    )
      return NextResponse.json({ error: "Type the writer's email address exactly to confirm." }, { status: 400 });
    await pb.collection("users").delete(user.id);
    await audit(me, "writer.delete", target, user.access === "paid" ? "Paid account" : "");
    return NextResponse.json({ deleted: user.id });
  }
  const row = writers(await loadAdminData(), listPrice()).find((w) => w.id === user.id);
  return NextResponse.json({ writer: row, ...extra });
}
