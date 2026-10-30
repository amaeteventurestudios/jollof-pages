import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { balance, caller, creditTopup } from "@/lib/server/credits";
import { getCheckout, stripeConfigured } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { sessionId } when the writer comes back from Stripe. Credits the payment right away
 * instead of waiting for the webhook; both paths credit a session only once.
 */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ error: "Payments are not set up." }, { status: 503 });
  const { sessionId } = (await req.json().catch(() => ({}))) as { sessionId?: string };
  if (!sessionId?.startsWith("cs_")) return NextResponse.json({ error: "Unknown payment." }, { status: 400 });
  try {
    const s = await getCheckout(sessionId);
    if (s.client_reference_id !== me.id) return NextResponse.json({ error: "This payment belongs to another account." }, { status: 403 });
    if (s.payment_status !== "paid") return NextResponse.json({ paid: false, credits: await balance(me.id) });
    const added = await creditTopup({ sessionId: s.id, userId: me.id, credits: Number(s.metadata.credits) || 0, cents: s.amount_total ?? 0 });
    return NextResponse.json({ paid: true, added: added ? Number(s.metadata.credits) : 0, credits: await balance(me.id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
