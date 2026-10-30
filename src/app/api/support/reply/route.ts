import { NextResponse } from "next/server";
import { adminConfigured, adminPb, caller } from "@/lib/server/credits";
import { bearer } from "@/lib/server/load-book";
import { publicOrigin } from "@/lib/server/origin";
import { isSupport, notifyTeam, notifyWriter, readTicketBody } from "@/lib/server/support";
import type { SupportReply, SupportRequest } from "@/lib/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { id, text?, status? }: add to a conversation. The support team answers (and can close);
 * the writer who asked can follow up, which reopens it.
 */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "Help requests are not set up on this server yet." }, { status: 503 });
  const parsed = await readTicketBody(req);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { fields: b, files } = parsed;
  const pb = await adminPb();
  const r = await pb
    .collection("support_requests")
    .getOne<SupportRequest>(String(b.id ?? ""))
    .catch(() => null);
  const team = isSupport(me.email);
  if (!r || (!team && r.owner !== me.id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const text = String(b.text ?? "").trim().slice(0, 10000);
  const from: SupportReply["from"] = team && r.owner !== me.id ? "support" : "writer";
  const said = !!text || files.length > 0;
  const status =
    from === "support" ? (b.status === "closed" || b.status === "open" ? b.status : said ? "answered" : r.status) : b.status === "closed" ? "closed" : "open";
  // files first, so the reply can name what they were saved as
  let names: string[] = [];
  let current = r;
  if (files.length) {
    current = await pb.collection("support_requests").update<SupportRequest>(r.id, { "attachments+": files });
    names = (current.attachments ?? []).filter((n) => !(r.attachments ?? []).includes(n));
  }
  const replies = [...(r.replies ?? []), ...(said ? [{ from, text, at: new Date().toISOString(), ...(names.length ? { files: names } : {}) }] : [])];
  const saved = await pb.collection("support_requests").update<SupportRequest>(current.id, { replies, status });
  const origin = publicOrigin(req);
  let emailed = false;
  if (said) emailed = from === "support" ? await notifyWriter(saved, text || "We added a file to your ticket.", `${origin}/studio/help`, "answer") : await notifyTeam(saved, `${origin}/studio/help#inbox`, text || `(${files.length} file${files.length === 1 ? "" : "s"} added)`);
  return NextResponse.json({ ok: true, emailed, request: saved });
}
