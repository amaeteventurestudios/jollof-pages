import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { resolveSite, serverPb } from "@/lib/pb-server";
import { adminConfigured, adminPb } from "@/lib/server/credits";
import { count } from "@/lib/server/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { email, source, site? }: adds a reader to the list of the site they joined from. */
export async function POST(req: Request) {
  const { email, source, site: key } = (await req.json().catch(() => ({}))) as { email?: string; source?: string; site?: string };
  const clean = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 254) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const site = await resolveSite(key || undefined);
  if (!site) return NextResponse.json({ error: "Unknown site." }, { status: 404 });
  try {
    await serverPb()
      .collection("subscribers")
      .create({ email: clean, source: String(source ?? "website").slice(0, 120), owner: site.owner, token: randomBytes(20).toString("hex") });
    count(site.owner, "signup", String(source ?? "website").slice(0, 120));
  } catch (e) {
    // already on this list is still a success for the reader; someone who left and comes back rejoins
    if ((e as { status?: number }).status !== 400) return NextResponse.json({ error: "Could not join right now." }, { status: 502 });
    if (adminConfigured()) {
      const pb = await adminPb().catch(() => null);
      const row = await pb
        ?.collection("subscribers")
        .getFirstListItem<{ id: string; unsubscribed: boolean }>(pb.filter("owner = {:o} && email = {:e}", { o: site.owner, e: clean }))
        .catch(() => null);
      if (row?.unsubscribed) await pb!.collection("subscribers").update(row.id, { unsubscribed: false });
    }
  }
  return NextResponse.json({ ok: true });
}
