import { NextResponse } from "next/server";
import { adminConfigured, adminPb, caller } from "@/lib/server/credits";
import { bearer } from "@/lib/server/load-book";
import { toIdea, type IdeaRow } from "@/lib/server/ideas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { id }: vote for an idea, or take the vote back. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "Not set up." }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { id?: string };
  const pb = await adminPb();
  const row = await pb
    .collection("feature_requests")
    .getOne<IdeaRow>(String(b.id ?? ""))
    .catch(() => null);
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const voters = new Set(row.voters ?? []);
  if (voters.has(me.id)) voters.delete(me.id);
  else voters.add(me.id);
  const saved = await pb.collection("feature_requests").update<IdeaRow>(row.id, { voters: [...voters], votes: voters.size });
  return NextResponse.json({ idea: toIdea(saved, me.id) });
}
