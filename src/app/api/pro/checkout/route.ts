import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { caller } from "@/lib/server/credits";
import { getBilling, proAvailable } from "@/lib/server/pro";
import { publicOrigin } from "@/lib/server/origin";
import { createProCheckout } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { interval: "month" | "year" } → { url } of a Stripe Checkout page for Author Site Pro. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!proAvailable()) return NextResponse.json({ error: "Author Site Pro is not on sale yet." }, { status: 503 });
  const { interval } = (await req.json().catch(() => ({}))) as { interval?: string };
  try {
    const billing = await getBilling(me.id);
    if (billing?.stripe_subscription && ["active", "trialing", "past_due", "canceling"].includes(billing.status))
      return NextResponse.json({ error: "You already have Pro. Use Manage plan to change it." }, { status: 400 });
    const back = `${publicOrigin(req)}/desk/site`;
    const session = await createProCheckout({
      userId: me.id,
      email: me.email,
      customer: billing?.stripe_customer || undefined,
      interval: interval === "year" ? "year" : "month",
      successUrl: `${back}?pro=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${back}?pro=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
