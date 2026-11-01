import { NextResponse } from "next/server";
import { audit, requireAdmin } from "@/lib/server/admin";
import { FLAGS, type FlagKey } from "@/lib/flags";
import { getFlags, setFlag } from "@/lib/server/flags";
import { namecomConfigured } from "@/lib/server/namecom";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** What else each switch needs on the server before it can work, beyond being switched on. */
const ready = () => ({ free_domains: namecomConfigured() }) satisfies Record<FlagKey, boolean>;

/** GET: every site-wide switch and whether it is on. */
export async function GET(req: Request) {
  const me = await requireAdmin(req, "switches");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  return NextResponse.json({ flags: await getFlags(), ready: ready() });
}

/** POST {key, on}: switch one on or off. */
export async function POST(req: Request) {
  const me = await requireAdmin(req, "flags.manage");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const b = (await req.json().catch(() => ({}))) as { key?: string; on?: unknown };
  if (!b.key || !(b.key in FLAGS) || typeof b.on !== "boolean") return NextResponse.json({ error: "Unknown switch." }, { status: 400 });
  const key = b.key as FlagKey;
  try {
    const flags = await setFlag(key, b.on, me.email);
    await audit(me, b.on ? "flag.on" : "flag.off", { id: key, label: FLAGS[key].label });
    return NextResponse.json({ flags, ready: ready() });
  } catch {
    return NextResponse.json({ error: "Couldn't save the switch. Try again in a moment." }, { status: 500 });
  }
}
