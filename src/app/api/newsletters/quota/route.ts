import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { caller } from "@/lib/server/credits";
import { creditEmailTopup, emailQuota } from "@/lib/server/email-quota";
import { getCheckout, stripeConfigured } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: the author's newsletter emails this month and bought emails left. */
export async function GET(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    return NextResponse.json(await emailQuota(me));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}

/**
 * POST { sessionId } when the author comes back from Stripe: credits the bought emails right
 * away instead of waiting for the webhook; both paths credit a session only once.
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
    if (s.metadata?.kind !== "email-credits") return NextResponse.json({ error: "Unknown payment." }, { status: 400 });
    const paid = s.payment_status === "paid";
    if (paid) await creditEmailTopup({ sessionId: s.id, userId: me.id, emails: Number(s.metadata.emails) || 0, cents: s.amount_total ?? 0 });
    return NextResponse.json({ paid, quota: await emailQuota(me) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
