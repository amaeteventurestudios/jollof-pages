import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { caller } from "@/lib/server/credits";
import { getBilling } from "@/lib/server/pro";
import { publicOrigin } from "@/lib/server/origin";
import { createPortal } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST → { url } of Stripe's page for changing card, switching plan, invoices and cancelling. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const billing = await getBilling(me.id).catch(() => null);
  if (!billing?.stripe_customer) return NextResponse.json({ error: "No plan to manage yet." }, { status: 404 });
  try {
    const { url } = await createPortal(billing.stripe_customer, `${publicOrigin(req)}/studio/site`);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
