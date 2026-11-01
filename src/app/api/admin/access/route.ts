import { NextResponse } from "next/server";
import { adminPb } from "@/lib/server/credits";
import { audit, loadAdminData, listPrice, requireAdmin } from "@/lib/server/admin";
import { studioSummary } from "@/lib/server/studio";
import { writers } from "@/lib/admin";
import type { AccessPerson } from "@/lib/studio-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Switch = { id: string; email: string; studio_off?: boolean; ai_writer?: boolean };
const APPS = { studio: "Jollof Studio", aiWriter: "AI writer" } as const;

/**
 * GET: everyone who can use a Jollof app, in one list matched by email: Jollof Pages writers,
 * Jollof Studio accounts, and emails switched on or off here. If Studio can't be reached the
 * list still loads, with `studioError` saying why.
 */
export async function GET(req: Request) {
  const me = await requireAdmin(req, "writers");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const pb = await adminPb();
  const [data, switches, studio] = await Promise.all([
    loadAdminData(),
    pb
      .collection("app_access")
      .getFullList<Switch>({ batch: 500 })
      .catch(() => [] as Switch[]),
    studioSummary().then(
      (s) => ({ people: s.people, error: "" }),
      (e: Error) => ({ people: [], error: e.message }),
    ),
  ]);
  const people = new Map<string, AccessPerson>();
  for (const w of writers(data, listPrice())) {
    if (w.access === "collaborator") continue;
    people.set(w.email.toLowerCase(), { email: w.email, name: w.name, writerId: w.id, inStudio: false, suspended: w.suspended, apps: w.apps });
  }
  const sw = new Map(switches.map((s) => [s.email.toLowerCase(), s]));
  const loose = (email: string, name = ""): AccessPerson => {
    const s = sw.get(email.toLowerCase());
    return { email, name, writerId: "", inStudio: false, suspended: false, apps: { studio: !s?.studio_off, aiWriter: Boolean(s?.ai_writer) } };
  };
  for (const p of studio.people) {
    const key = p.email.toLowerCase();
    const row = people.get(key) ?? loose(p.email, p.name);
    row.inStudio = true;
    if (!row.name) row.name = p.name;
    people.set(key, row);
  }
  for (const s of switches) if (!people.has(s.email.toLowerCase())) people.set(s.email.toLowerCase(), loose(s.email));
  return NextResponse.json({ people: [...people.values()], studioError: studio.error });
}

/** POST { email, app: "studio" | "aiWriter", on }: flips the switch on their Jollof Pages account, or for a Studio-only email. */
export async function POST(req: Request) {
  const me = await requireAdmin(req, "writer.apps");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const b = (await req.json().catch(() => ({}))) as { email?: string; app?: string; on?: boolean };
  const email = String(b.email ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Give an email." }, { status: 400 });
  if (b.app !== "studio" && b.app !== "aiWriter") return NextResponse.json({ error: "Unknown app." }, { status: 400 });
  const on = Boolean(b.on);
  const fields = b.app === "studio" ? { studio_off: !on } : { ai_writer: on };
  const pb = await adminPb();
  const user = await pb
    .collection("users")
    .getFirstListItem<{ id: string; email: string }>(pb.filter("email = {:e}", { e: email }))
    .catch(() => null);
  if (user) {
    await pb.collection("users").update(user.id, fields);
  } else {
    const row = await pb
      .collection("app_access")
      .getFirstListItem<Switch>(pb.filter("email = {:e}", { e: email }))
      .catch(() => null);
    if (row) await pb.collection("app_access").update(row.id, fields);
    else await pb.collection("app_access").create({ email, ...fields });
  }
  await audit(me, on ? "writer.app_on" : "writer.app_off", { id: user?.id, label: email }, APPS[b.app]);
  return NextResponse.json({ ok: true });
}
