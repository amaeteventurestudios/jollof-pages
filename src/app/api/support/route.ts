import { NextResponse } from "next/server";
import { adminConfigured, adminPb, caller } from "@/lib/server/credits";
import { bearer } from "@/lib/server/load-book";
import { publicOrigin } from "@/lib/server/origin";
import { isSupport, notifyTeam, notifyWriter } from "@/lib/server/support";
import { SUPPORT_TOPICS, type SupportRequest } from "@/lib/support";
import { readTicketBody } from "@/lib/server/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: the caller's requests, or every request for the support team. */
export async function GET(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "Help requests are not set up on this server yet." }, { status: 503 });
  const team = isSupport(me.email);
  const pb = await adminPb();
  const requests = await pb.collection("support_requests").getFullList<SupportRequest>({ sort: "-updated", ...(team ? {} : { filter: pb.filter("owner = {:o}", { o: me.id }) }) });
  return NextResponse.json({ team, requests });
}

/** POST { topic, subject, message, page } as JSON, or as a form with screenshots in "files": a new ticket. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "Help requests are not set up on this server yet." }, { status: 503 });
  const parsed = await readTicketBody(req);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { fields: b, files } = parsed;
  const topic = SUPPORT_TOPICS.some((t) => t.id === b.topic) ? b.topic : "question";
  const subject = String(b.subject ?? "").trim().slice(0, 200);
  const message = String(b.message ?? "").trim().slice(0, 10000);
  if (!subject || message.length < 10) return NextResponse.json({ error: "Add a subject and a few words about what you need." }, { status: 400 });
  const pb = await adminPb();
  // a little flood control: ten open requests at once is plenty
  const open = await pb.collection("support_requests").getList(1, 1, { filter: pb.filter("owner = {:o} && status = 'open'", { o: me.id }) });
  if (open.totalItems >= 10) return NextResponse.json({ error: "You have ten open requests already. We will answer those first." }, { status: 429 });
  const last = await pb
    .collection("support_requests")
    .getList<SupportRequest>(1, 1, { sort: "-number" })
    .catch(() => null);
  const number = Math.max(1000, last?.items[0]?.number ?? 0) + 1;
  const r = await pb
    .collection("support_requests")
    .create<SupportRequest>({ owner: me.id, email: me.email, topic, subject, message, status: "open", replies: [], page: String(b.page ?? "").slice(0, 500), number, ...(files.length ? { attachments: files } : {}) });
  const origin = publicOrigin(req);
  const emailed = await notifyTeam(r, `${origin}/studio/help#inbox`);
  await notifyWriter(r, "", `${origin}/studio/help`, "received");
  return NextResponse.json({ ok: true, emailed, request: r });
}
