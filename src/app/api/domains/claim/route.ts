import { NextResponse } from "next/server";
import { freeDomainsOpen } from "@/lib/server/flags";
import { bearer } from "@/lib/server/load-book";
import { adminPb, caller } from "@/lib/server/credits";
import { checkAvailability, type Registrant } from "@/lib/server/namecom";
import { asDomain, freeMaxCents, freeTlds } from "@/lib/server/domain-rules";
import {
  getBilling,
  proAvailable,
  registerWaitingDomain,
  type DomainRow,
} from "@/lib/server/pro";
import { publicOrigin } from "@/lib/server/origin";
import { createProCheckout } from "@/lib/server/stripe";
import { DOMAIN_RE } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED: (keyof Registrant)[] = [
  "firstName",
  "lastName",
  "address1",
  "city",
  "state",
  "zip",
  "country",
  "phone",
  "email",
];

/**
 * POST { domain, registrant } claims the free first-year domain. Yearly Pro members get it
 * registered now; anyone else is sent to the yearly Pro checkout and it is registered when the
 * payment clears.
 */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!proAvailable() || !(await freeDomainsOpen()))
    return NextResponse.json(
      { error: "Free domains are not available yet." },
      { status: 503 },
    );
  const body = (await req.json().catch(() => ({}))) as {
    domain?: string;
    registrant?: Partial<Registrant>;
  };
  const domain = asDomain(body.domain || "");
  if (
    !DOMAIN_RE.test(domain) ||
    !freeTlds().includes(domain.split(".").slice(1).join("."))
  )
    return NextResponse.json(
      { error: "Choose a .com name first." },
      { status: 400 },
    );

  const r = Object.fromEntries(
    Object.entries(body.registrant ?? {}).map(([k, v]) => [
      k,
      String(v ?? "")
        .trim()
        .slice(0, 120),
    ]),
  ) as unknown as Registrant;
  const missing = REQUIRED.filter((k) => !r[k]);
  if (missing.length)
    return NextResponse.json(
      {
        error:
          "Fill in every field: domain registries require the owner's name, address, phone and email.",
      },
      { status: 400 },
    );
  r.country = r.country.toUpperCase().slice(0, 2);
  // Name.com wants +<country code>.<number>
  const digits = r.phone.replace(/[^\d+]/g, "");
  r.phone = digits.startsWith("+")
    ? digits.replace(/^\+(\d{1,3})(\d+)$/, "+$1.$2")
    : `+1.${digits}`;

  try {
    const billing = await getBilling(me.id);
    if (billing?.free_domain_used)
      return NextResponse.json(
        { error: "Your free domain has already been used." },
        { status: 400 },
      );
    const a = await checkAvailability(domain);
    const cents = Math.round((a.purchasePrice ?? 0) * 100);
    if (!a.purchasable || a.premium || cents > freeMaxCents())
      return NextResponse.json(
        { error: `${domain} is not available as a free domain. Try another.` },
        { status: 400 },
      );

    const pb = await adminPb();
    // one claim at a time: drop an earlier unpaid or failed claim
    const old = await pb
      .collection("domains")
      .getFullList<DomainRow>({
        filter: pb.filter(
          "owner = {:o} && (status = 'waiting_payment' || status = 'failed')",
          { o: me.id },
        ),
      });
    for (const d of old)
      await pb
        .collection("domains")
        .delete(d.id)
        .catch(() => undefined);
    const row = await pb
      .collection("domains")
      .create<DomainRow>({
        owner: me.id,
        domain,
        status: "waiting_payment",
        price_cents: cents,
        registrant: r,
      });

    const yearly =
      billing?.interval === "year" &&
      ["active", "trialing", "past_due", "canceling"].includes(billing.status);
    if (yearly)
      return NextResponse.json({ domain: await registerWaitingDomain(row.id) });
    if (
      billing?.stripe_subscription &&
      ["active", "trialing", "past_due"].includes(billing.status)
    )
      return NextResponse.json(
        {
          error:
            "The free domain comes with the yearly plan. Switch to yearly under Manage plan, then claim it.",
        },
        { status: 400 },
      );

    const back = `${publicOrigin(req)}/studio/site`;
    const session = await createProCheckout({
      userId: me.id,
      email: me.email,
      customer: billing?.stripe_customer || undefined,
      interval: "year",
      domainId: row.id,
      successUrl: `${back}?pro=paid&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${back}?pro=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
