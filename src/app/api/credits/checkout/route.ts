import { NextResponse } from "next/server";
import { CREDIT_PACKS } from "@/lib/cover-ai";
import { bearer } from "@/lib/server/load-book";
import { addLedger, caller } from "@/lib/server/credits";
import { falConfigured } from "@/lib/server/fal";
import { publicOrigin } from "@/lib/server/origin";
import { createCheckout, stripeConfigured } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { pack, bookId? } → { url } of a Stripe Checkout page, or test credits when no keys are set. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { pack: packId, bookId } = (await req.json().catch(() => ({}))) as { pack?: string; bookId?: string };
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) return NextResponse.json({ error: "Pick a credit pack." }, { status: 400 });

  try {
    if (!stripeConfigured()) {
      // test mode hands out credits only while pictures are test pictures too, so nothing real is ever free
      if (falConfigured()) return NextResponse.json({ error: "Payments are not set up yet (STRIPE_SECRET_KEY is missing on the server)." }, { status: 503 });
      await addLedger({ owner: me.id, delta: pack.credits, reason: "grant", note: "Test mode top-up (no payment)" });
      return NextResponse.json({ test: true, credits: pack.credits });
    }
    const back = `${publicOrigin(req)}${bookId ? `/desk/books/${encodeURIComponent(bookId)}?tab=cover` : "/desk"}`;
    const join = back.includes("?") ? "&" : "?";
    const session = await createCheckout({
      pack,
      userId: me.id,
      email: me.email,
      successUrl: `${back}${join}credits=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${back}${join}credits=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
