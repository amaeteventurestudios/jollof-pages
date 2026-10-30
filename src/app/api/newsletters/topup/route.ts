import { NextResponse } from "next/server";
import { EMAIL_PACKS } from "@/lib/email-quota";
import { bearer } from "@/lib/server/load-book";
import { caller } from "@/lib/server/credits";
import { publicOrigin } from "@/lib/server/origin";
import { createEmailCheckout, stripeConfigured } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { pack } → { url } of a Stripe Checkout page for extra newsletter emails. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { pack: packId } = (await req.json().catch(() => ({}))) as { pack?: string };
  const pack = EMAIL_PACKS.find((p) => p.id === packId);
  if (!pack) return NextResponse.json({ error: "Pick a pack of emails." }, { status: 400 });
  if (!stripeConfigured()) return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
  try {
    const back = `${publicOrigin(req)}/studio/readers`;
    const session = await createEmailCheckout({
      pack,
      userId: me.id,
      email: me.email,
      successUrl: `${back}?emails=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${back}?emails=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
