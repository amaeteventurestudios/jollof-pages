import { NextResponse } from "next/server";
import { freeDomainsOpen } from "@/lib/server/flags";
import { bearer } from "@/lib/server/load-book";
import { adminPb, caller } from "@/lib/server/credits";
import { getBilling, proAvailable, saveBilling, type DomainRow } from "@/lib/server/pro";
import { getAccount, proPriceCents } from "@/lib/server/stripe";
import { mailConfigured } from "@/lib/server/mail";
import { hasPro } from "@/lib/sites";
import type { SiteSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET → everything the Desk needs to show Pro: plan, prices, domain, payouts, and what the server has set up. */
export async function GET(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    const pb = await adminPb();
    const site = await pb
      .collection("site_settings")
      .getFirstListItem<SiteSettings>(pb.filter("owner = {:o}", { o: me.id }))
      .catch(() => null);
    let billing = await getBilling(me.id);
    // payouts finish on Stripe's own pages, so check back on the way in
    if (billing?.payout_account && !billing.payouts_ready && proAvailable()) {
      const acct = await getAccount(billing.payout_account).catch(() => null);
      if (acct?.charges_enabled && acct.payouts_enabled) billing = await saveBilling(me.id, { payouts_ready: true });
    }
    const domains = await pb.collection("domains").getFullList<DomainRow>({ filter: pb.filter("owner = {:o}", { o: me.id }), sort: "-created" });
    return NextResponse.json({
      available: proAvailable(),
      prices: { month: proPriceCents("month"), year: proPriceCents("year") },
      pro: hasPro(site),
      until: site?.pro_until ?? "",
      interval: billing?.interval ?? "",
      status: billing?.status ?? "",
      canManage: Boolean(billing?.stripe_customer),
      freeDomain: { configured: await freeDomainsOpen(), used: Boolean(billing?.free_domain_used) },
      domains: domains.map((d) => ({ id: d.id, domain: d.domain, status: d.status, error: d.error, expires: d.expires })),
      payouts: { ready: Boolean(billing?.payouts_ready), started: Boolean(billing?.payout_account) },
      mail: mailConfigured(),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
