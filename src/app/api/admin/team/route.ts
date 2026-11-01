import { NextResponse } from "next/server";
import { adminPb } from "@/lib/server/credits";
import { audit, forgetStaff, ownerEmails, requireAdmin } from "@/lib/server/admin";
import { STAFF_ROLES, roleLabel, type StaffRole } from "@/lib/admin-roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StaffRow {
  id: string;
  email: string;
  role: StaffRole;
  note?: string;
  added_by?: string;
  created: string;
}

async function list() {
  const pb = await adminPb();
  const staff = await pb.collection("staff").getFullList<StaffRow>({ sort: "created" });
  const emails = staff.map((s) => s.email.toLowerCase());
  // whether each person already has a studio account to sign in with
  const users = emails.length
    ? await pb
        .collection("users")
        .getFullList<{ email: string }>({ fields: "email", filter: emails.map((e) => pb.filter("email = {:e}", { e })).join(" || ") })
        .catch(() => [])
    : [];
  const has = new Set(users.map((u) => u.email.toLowerCase()));
  return { owners: ownerEmails(), staff: staff.map((s) => ({ ...s, hasAccount: has.has(s.email.toLowerCase()) })) };
}

/** GET: the owner and every staff member with their role. */
export async function GET(req: Request) {
  const me = await requireAdmin(req, "team");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  return NextResponse.json(await list());
}

/**
 * POST { action: "add", email, role, note } adds someone (they sign in with their own Desk
 * account under that email). POST { action: "role", id, role } changes a role, and
 * POST { action: "remove", id } takes someone off the team.
 */
export async function POST(req: Request) {
  const me = await requireAdmin(req, "team.manage");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const b = (await req.json().catch(() => ({}))) as { action?: string; id?: string; email?: string; role?: string; note?: string };
  const pb = await adminPb();
  const role = b.role as StaffRole;
  try {
    if (b.action === "add") {
      const email = String(b.email ?? "")
        .trim()
        .toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Type their email address." }, { status: 400 });
      if (!STAFF_ROLES.includes(role)) return NextResponse.json({ error: "Pick a role." }, { status: 400 });
      if (ownerEmails().includes(email)) return NextResponse.json({ error: "That's an owner address; owners can already do everything." }, { status: 400 });
      const dup = await pb
        .collection("staff")
        .getFirstListItem(pb.filter("email = {:e}", { e: email }))
        .catch(() => null);
      if (dup) return NextResponse.json({ error: "They're already on the team. Change their role below." }, { status: 400 });
      const row = await pb.collection("staff").create<StaffRow>({ email, role, note: String(b.note ?? "").slice(0, 200), added_by: me.email });
      await audit(me, "team.add", { id: row.id, label: email }, roleLabel(role));
    } else if (b.action === "role") {
      if (!STAFF_ROLES.includes(role)) return NextResponse.json({ error: "Pick a role." }, { status: 400 });
      const row = await pb.collection("staff").update<StaffRow>(String(b.id ?? ""), { role });
      await audit(me, "team.role", { id: row.id, label: row.email }, roleLabel(role));
    } else if (b.action === "remove") {
      const row = await pb.collection("staff").getOne<StaffRow>(String(b.id ?? ""));
      await pb.collection("staff").delete(row.id);
      await audit(me, "team.remove", { id: row.id, label: row.email }, roleLabel(row.role));
    } else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
  forgetStaff();
  return NextResponse.json(await list());
}
