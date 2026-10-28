import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { caller } from "@/lib/server/credits";
import { handleCheckoutSession } from "@/lib/server/webhooks";
import { getCheckout, stripeConfigured } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { sessionId } on the way back from Stripe: turns Pro on without waiting for the webhook. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ error: "Payments are not set up." }, { status: 503 });
  const { sessionId } = (await req.json().catch(() => ({}))) as { sessionId?: string };
  if (!sessionId?.startsWith("cs_")) return NextResponse.json({ error: "Unknown payment." }, { status: 400 });
  try {
    const s = await getCheckout(sessionId);
    if (s.client_reference_id !== me.id) return NextResponse.json({ error: "This payment belongs to another account." }, { status: 403 });
    if (s.payment_status !== "paid") return NextResponse.json({ paid: false });
    await handleCheckoutSession(s);
    return NextResponse.json({ paid: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
