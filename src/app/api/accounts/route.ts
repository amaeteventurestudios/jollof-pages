import { NextResponse } from "next/server";
import { adminPb } from "@/lib/server/credits";
import { allowSignup, signupMode, subdomainAvailability } from "@/lib/server/accounts";
import { publicOrigin } from "@/lib/server/origin";
import { createStudioCheckout } from "@/lib/server/stripe";
import { slugify } from "@/lib/slug";
import { admitTester, usableInvite } from "@/lib/server/invites";
import type { TesterInvite } from "@/lib/invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { name, email, password, subdomain } creates a studio account, its author site at
 * <subdomain>.jollofpages.com and a first pen name. In paid mode the account waits on a Stripe
 * payment: the reply carries the Checkout address to send the author to after signing in.
 * With { invite } (a tester link from the owner's admin) the account opens free, whatever the mode.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { name?: string; email?: string; password?: string; subdomain?: string; invite?: string };
  let invite: TesterInvite | null = null;
  if (body.invite) {
    const found = await usableInvite(String(body.invite));
    if ("problem" in found) return NextResponse.json({ error: found.problem }, { status: 403 });
    invite = found.invite;
  }
  const mode = invite ? "free" : signupMode();
  if (mode === "closed") return NextResponse.json({ error: "Sign-up is not open yet. Join the early-access list on the home page." }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allowSignup(ip)) return NextResponse.json({ error: "Too many sign-ups from here. Try again in an hour." }, { status: 429 });

  const name = String(body.name ?? "").trim().slice(0, 120);
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const subdomain = String(body.subdomain ?? "").trim().toLowerCase();
  if (!name) return NextResponse.json({ error: "Enter the name readers know you by." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 10) return NextResponse.json({ error: "Use a password of at least 10 characters." }, { status: 400 });

  try {
    const taken = await subdomainAvailability(subdomain);
    if (taken) return NextResponse.json({ error: taken, field: "subdomain" }, { status: 400 });

    const pb = await adminPb();
    let user;
    try {
      user = await pb.collection("users").create({ email, password, passwordConfirm: password, name, emailVisibility: false, access: mode === "free" ? "comp" : "pending" });
    } catch {
      return NextResponse.json({ error: "There is already an account with that email. Sign in instead.", field: "email" }, { status: 400 });
    }
    try {
      await pb.collection("site_settings").create({ owner: user.id, publisher_name: name, subdomain, email: "" });
      await pb.collection("authors").create({ owner: user.id, name, slug: slugify(name) || "author" });
      if (invite) await admitTester(pb, invite, user.id);
    } catch (e) {
      await pb.collection("users").delete(user.id).catch(() => undefined);
      throw e;
    }

    if (mode === "free") return NextResponse.json({ ok: true });
    const origin = publicOrigin(req);
    const session = await createStudioCheckout({
      userId: user.id,
      email,
      successUrl: `${origin}/studio?studio=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/studio?studio=cancelled`,
    });
    return NextResponse.json({ ok: true, checkoutUrl: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
