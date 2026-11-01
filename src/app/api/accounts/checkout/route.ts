import { NextResponse } from "next/server";
import { brandOf } from "@/lib/server/brand";
import { bearer } from "@/lib/server/load-book";
import { caller } from "@/lib/server/credits";
import { publicOrigin } from "@/lib/server/origin";
import { createStudioCheckout, stripeConfigured } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST → { url } of a fresh Stripe Checkout page, for an author who left before paying. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
  try {
    const origin = publicOrigin(req);
    const session = await createStudioCheckout({
      userId: me.id,
      email: me.email,
      successUrl: `${origin}/studio?studio=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/studio?studio=cancelled`,
      brand: await brandOf(req),
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
