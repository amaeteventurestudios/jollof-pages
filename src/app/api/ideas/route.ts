import { NextResponse } from "next/server";
import { adminConfigured, adminPb, caller } from "@/lib/server/credits";
import { bearer } from "@/lib/server/load-book";
import { isSupport, notifyTeamOfIdea } from "@/lib/server/support";
import { toIdea, type IdeaRow } from "@/lib/server/ideas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: every idea, most wanted first. */
export async function GET(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "Feature requests are not set up on this server yet." }, { status: 503 });
  const pb = await adminPb();
  const rows = await pb.collection("feature_requests").getFullList<IdeaRow>({ sort: "-votes,-created" });
  return NextResponse.json({ team: await isSupport(me.email), ideas: rows.map((r) => toIdea(r, me.id)) });
}

/** POST { title, details }: a new idea, with the writer's own vote on it. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "Feature requests are not set up on this server yet." }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { title?: string; details?: string };
  const title = String(b.title ?? "")
    .trim()
    .slice(0, 140);
  const details = String(b.details ?? "")
    .trim()
    .slice(0, 4000);
  if (title.length < 4) return NextResponse.json({ error: "Give your idea a short title." }, { status: 400 });
  const pb = await adminPb();
  const today = await pb
    .collection("feature_requests")
    .getList(1, 1, { filter: pb.filter("owner = {:o} && created >= {:d}", { o: me.id, d: new Date(Date.now() - 864e5).toISOString().replace("T", " ") }) });
  if (today.totalItems >= 10) return NextResponse.json({ error: "That's ten ideas today. Thank you! Add more tomorrow." }, { status: 429 });
  const row = await pb.collection("feature_requests").create<IdeaRow>({ owner: me.id, title, details, status: "new", voters: [me.id], votes: 1, response: "" });
  void notifyTeamOfIdea(me.email, title, details, `${new URL(req.url).origin}/desk/ideas`);
  return NextResponse.json({ idea: toIdea(row, me.id) });
}
