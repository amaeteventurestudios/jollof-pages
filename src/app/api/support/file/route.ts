import { adminConfigured, adminPb, caller } from "@/lib/server/credits";
import { bearer } from "@/lib/server/load-book";
import { isSupport } from "@/lib/server/support";
import type { SupportRequest } from "@/lib/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?id=&name=: a screenshot on a ticket, for the writer who sent it and the support team. */
export async function GET(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return new Response("Sign in first.", { status: 401 });
  if (!adminConfigured()) return new Response("Not set up.", { status: 503 });
  const q = new URL(req.url).searchParams;
  const pb = await adminPb();
  const r = await pb
    .collection("support_requests")
    .getOne<SupportRequest>(q.get("id") || "")
    .catch(() => null);
  const name = q.get("name") || "";
  if (!r || (r.owner !== me.id && !(await isSupport(me.email))) || !(r.attachments ?? []).includes(name)) return new Response("Not found.", { status: 404 });
  const res = await fetch(pb.files.getURL(r, name, { token: await pb.files.getToken() }));
  if (!res.ok || !res.body) return new Response("Could not fetch the file.", { status: 502 });
  return new Response(res.body, { headers: { "Content-Type": res.headers.get("content-type") || "application/octet-stream", "Cache-Control": "private, max-age=3600" } });
}
