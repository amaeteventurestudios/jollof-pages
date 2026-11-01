import { NextResponse } from "next/server";
import { brandOf } from "@/lib/server/brand";
import { bearer } from "@/lib/server/load-book";
import { adminPb, caller } from "@/lib/server/credits";
import { allowSignup, signupMode, subdomainAvailability } from "@/lib/server/accounts";
import { publicOrigin } from "@/lib/server/origin";
import { createStudioCheckout } from "@/lib/server/stripe";
import { slugify } from "@/lib/slug";
import { admitTester, usableInvite } from "@/lib/server/invites";
import type { TesterInvite } from "@/lib/invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { name, subdomain } finishes a studio account that started with "Sign up with Google". The
 * PocketBase hook made the user (access "pending"); this adds the author site and first pen name,
 * then opens the Desk (free mode, or a tester invite) or hands back the Stripe Checkout address.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string; subdomain?: string; invite?: string };
  let invite: TesterInvite | null = null;
  if (body.invite) {
    const found = await usableInvite(String(body.invite));
    if ("problem" in found) return NextResponse.json({ error: found.problem }, { status: 403 });
    invite = found.invite;
  }
  const mode = invite ? "free" : signupMode();
  if (mode === "closed") return NextResponse.json({ error: "Sign-up is not open yet. Join the early-access list on the home page." }, { status: 403 });
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in with Google first." }, { status: 401 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allowSignup(ip)) return NextResponse.json({ error: "Too many sign-ups from here. Try again in an hour." }, { status: 429 });

  const name = String(body.name ?? "").trim().slice(0, 120);
  const subdomain = String(body.subdomain ?? "").trim().toLowerCase();
  if (!name) return NextResponse.json({ error: "Enter the name readers know you by." }, { status: 400 });

  try {
    const pb = await adminPb();
    const user = await pb.collection("users").getOne(me.id);
    const existing = await pb.collection("site_settings").getList(1, 1, { filter: pb.filter("owner = {:id}", { id: me.id }) });
    // only a fresh Google account is finished here; anything else already has its Desk
    if (user.access !== "pending" || existing.totalItems) return NextResponse.json({ ok: true });

    const taken = await subdomainAvailability(subdomain);
    if (taken) return NextResponse.json({ error: taken, field: "subdomain" }, { status: 400 });
    const site = await pb.collection("site_settings").create({ owner: me.id, publisher_name: name, subdomain, email: "" });
    try {
      await pb.collection("authors").create({ owner: me.id, name, slug: slugify(name) || "author" });
      const brand = await brandOf(req);
      await pb.collection("users").update(me.id, { name, ...(mode === "free" ? { access: "comp" } : {}), ...(brand ? { brand: brand.id } : {}) });
      if (invite) await admitTester(pb, invite, me.id);
    } catch (e) {
      await pb.collection("site_settings").delete(site.id).catch(() => undefined);
      throw e;
    }

    if (mode === "free") return NextResponse.json({ ok: true });
    const origin = publicOrigin(req);
    const session = await createStudioCheckout({
      userId: me.id,
      email: me.email,
      successUrl: `${origin}/desk?studio=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/desk?studio=cancelled`,
      brand: await brandOf(req),
    });
    return NextResponse.json({ ok: true, checkoutUrl: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
