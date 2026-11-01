import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { adminPb, caller } from "@/lib/server/credits";
import { subdomainAvailability } from "@/lib/server/accounts";
import { getBilling } from "@/lib/server/pro";
import type { Book, SiteSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { action: "delete" } deletes the signed-in author's website: its address, own-domain link,
 * design and words. Their books stay in the Desk but come off the web (unpublished), and their
 * reader list stays on the Readers page. Refused while Author Site Pro is still billing.
 *
 * POST { action: "create", subdomain, name } makes a fresh website for an author who deleted theirs.
 */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; subdomain?: string; name?: string };

  try {
    const pb = await adminPb();
    const site = await pb
      .collection("site_settings")
      .getFirstListItem<SiteSettings>(pb.filter("owner = {:o}", { o: me.id }))
      .catch(() => null);

    if (body.action === "delete") {
      if (!site) return NextResponse.json({ ok: true });
      if (site.home) return NextResponse.json({ error: "This is the jollofpages.com site itself. It can't be deleted from the Desk." }, { status: 400 });
      const billing = await getBilling(me.id);
      if (billing && ["active", "trialing", "past_due"].includes(billing.status))
        return NextResponse.json({ error: "Cancel Author Site Pro first (Manage plan, card and invoices), so you are not charged for a website you deleted. Then delete the site." }, { status: 409 });
      const live = await pb.collection("books").getFullList<Book>({ filter: pb.filter("owner = {:o} && published = true", { o: me.id }), fields: "id" });
      for (const b of live) await pb.collection("books").update(b.id, { published: false });
      await pb.collection("site_settings").delete(site.id);
      return NextResponse.json({ ok: true, unpublished: live.length });
    }

    if (body.action === "create") {
      if (site) return NextResponse.json({ site });
      const user = await pb.collection("users").getOne<{ access?: string; name?: string }>(me.id);
      if (user.access !== "paid" && user.access !== "comp") return NextResponse.json({ error: "Finish setting up your Desk first." }, { status: 402 });
      const sub = String(body.subdomain ?? "").trim().toLowerCase();
      const problem = await subdomainAvailability(sub);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      const name = String(body.name ?? user.name ?? "").trim().slice(0, 120) || sub;
      const created = await pb.collection("site_settings").create<SiteSettings>({ owner: me.id, publisher_name: name, subdomain: sub, email: "" });
      return NextResponse.json({ site: created });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
