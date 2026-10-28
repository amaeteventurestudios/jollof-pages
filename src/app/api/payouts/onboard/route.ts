import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { caller } from "@/lib/server/credits";
import { getBilling, proAvailable, saveBilling } from "@/lib/server/pro";
import { publicOrigin } from "@/lib/server/origin";
import { accountLink, createExpressAccount } from "@/lib/server/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST → { url } of Stripe's onboarding, where an author adds the bank account their ebook sales are paid into. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!proAvailable()) return NextResponse.json({ error: "Payments are not set up yet." }, { status: 503 });
  try {
    let billing = await getBilling(me.id);
    if (!billing?.payout_account) billing = await saveBilling(me.id, { payout_account: (await createExpressAccount(me.email)).id });
    const back = `${publicOrigin(req)}/studio/site`;
    const { url } = await accountLink(billing.payout_account, `${back}?payouts=retry`, `${back}?payouts=done`);
    return NextResponse.json({ url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
