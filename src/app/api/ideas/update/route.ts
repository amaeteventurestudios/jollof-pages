import { NextResponse } from "next/server";
import { adminConfigured, adminPb, caller } from "@/lib/server/credits";
import { bearer } from "@/lib/server/load-book";
import { isSupport } from "@/lib/server/support";
import { IDEA_STATUSES } from "@/lib/support";
import { toIdea, type IdeaRow } from "@/lib/server/ideas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { id, status?, response?, remove? }: the support team moves an idea along, answers it, or removes it. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "Not set up." }, { status: 503 });
  if (!isSupport(me.email)) return NextResponse.json({ error: "Only the support team can do that." }, { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; status?: string; response?: string; remove?: boolean };
  const pb = await adminPb();
  const id = String(b.id ?? "");
  if (b.remove) {
    await pb.collection("feature_requests").delete(id);
    return NextResponse.json({ ok: true });
  }
  const patch: Record<string, string> = {};
  if (IDEA_STATUSES.some((s) => s.id === b.status)) patch.status = String(b.status);
  if (typeof b.response === "string") patch.response = b.response.trim().slice(0, 2000);
  const saved = await pb.collection("feature_requests").update<IdeaRow>(id, patch);
  return NextResponse.json({ idea: toIdea(saved, me.id) });
}
