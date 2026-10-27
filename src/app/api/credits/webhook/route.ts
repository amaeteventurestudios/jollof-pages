import { NextResponse } from "next/server";
import { creditTopup } from "@/lib/server/credits";
import { verifyWebhook, type CheckoutSession } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Stripe webhook: checkout.session.completed (and async_payment_succeeded) add the credits. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set." }, { status: 503 });
  const payload = await req.text();
  if (!verifyWebhook(payload, req.headers.get("stripe-signature"), secret)) return NextResponse.json({ error: "Bad signature." }, { status: 400 });

  const event = JSON.parse(payload) as { type: string; data: { object: CheckoutSession } };
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object;
    if (s.payment_status === "paid" && s.metadata?.kind === "cover-credits" && s.client_reference_id) {
      try {
        await creditTopup({ sessionId: s.id, userId: s.client_reference_id, credits: Number(s.metadata.credits) || 0, cents: s.amount_total ?? 0 });
      } catch (e) {
        // a 500 makes Stripe retry later
        return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
      }
    }
  }
  return NextResponse.json({ received: true });
}
