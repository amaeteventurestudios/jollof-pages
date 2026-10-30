import { NextResponse } from "next/server";
import { handleEvent } from "@/lib/server/webhooks";
import { verifyWebhook } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The one Stripe webhook for the whole app: AI cover credits, studio purchases, Author Site Pro
 * subscriptions and direct ebook sales. (The path keeps its first name so the endpoint already
 * registered in Stripe keeps working.)
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set." }, { status: 503 });
  const payload = await req.text();
  if (!verifyWebhook(payload, req.headers.get("stripe-signature"), secret)) return NextResponse.json({ error: "Bad signature." }, { status: 400 });
  try {
    await handleEvent(JSON.parse(payload));
  } catch (e) {
    // a 500 makes Stripe retry later
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
