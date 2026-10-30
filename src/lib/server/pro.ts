import "server-only";
import { resolve4 } from "node:dns/promises";
import { adminPb } from "./credits";
import { getSubscription, intervalOf, periodEnd, stripeConfigured, type ProInterval, type Subscription } from "./stripe";
import { namecomConfigured, pointAt, registerDomain, setAutorenew, type Registrant } from "./namecom";
import { rootDomain } from "../sites";
import type { SiteSettings } from "../types";

/** A few days' grace so a card retry does not take a site's domain offline. */
const GRACE_MS = 3 * 86400000;

export interface Billing {
  id: string;
  owner: string;
  stripe_customer: string;
  stripe_subscription: string;
  interval: ProInterval | "";
  status: string;
  free_domain_used: boolean;
  payout_account: string;
  payouts_ready: boolean;
}

export interface DomainRow {
  id: string;
  owner: string;
  domain: string;
  status: "waiting_payment" | "registering" | "active" | "failed" | "lapsed";
  price_cents: number;
  registrant: Registrant;
  error: string;
  expires: string;
}

export function proAvailable(): boolean {
  return stripeConfigured();
}

export async function getBilling(owner: string): Promise<Billing | null> {
  const pb = await adminPb();
  return pb
    .collection("billing")
    .getFirstListItem<Billing>(pb.filter("owner = {:o}", { o: owner }))
    .catch(() => null);
}

export async function saveBilling(owner: string, patch: Partial<Billing>): Promise<Billing> {
  const pb = await adminPb();
  const row = await getBilling(owner);
  return row ? pb.collection("billing").update<Billing>(row.id, patch) : pb.collection("billing").create<Billing>({ owner, ...patch });
}

async function siteOf(owner: string): Promise<SiteSettings | null> {
  const pb = await adminPb();
  return pb
    .collection("site_settings")
    .getFirstListItem<SiteSettings>(pb.filter("owner = {:o}", { o: owner }))
    .catch(() => null);
}

/** Copies a subscription's paid-up date onto the site, which is what turns Pro features on. */
export async function syncSubscription(owner: string, sub: Subscription): Promise<void> {
  const pb = await adminPb();
  const live = ["active", "trialing", "past_due"].includes(sub.status);
  await saveBilling(owner, { stripe_customer: sub.customer, stripe_subscription: sub.id, interval: intervalOf(sub), status: sub.cancel_at_period_end ? "canceling" : sub.status });
  const site = await siteOf(owner);
  if (site && live) await pb.collection("site_settings").update(site.id, { pro_until: new Date(periodEnd(sub) + GRACE_MS).toISOString().replace("T", " ") });
  // a domain we bought renews only while Pro does; when Pro ends the author keeps it and can move it
  const domains = await pb.collection("domains").getFullList<DomainRow>({ filter: pb.filter("owner = {:o} && status = 'active'", { o: owner }) });
  for (const d of domains) {
    const renew = live && !sub.cancel_at_period_end;
    if (namecomConfigured()) await setAutorenew(d.domain, renew).catch(() => undefined);
    await pb.collection("domains").update(d.id, { autorenew: renew });
  }
}

export async function syncSubscriptionById(owner: string, subscriptionId: string): Promise<void> {
  await syncSubscription(owner, await getSubscription(subscriptionId));
}

export async function ownerOfSubscription(subscriptionId: string): Promise<string | null> {
  const pb = await adminPb();
  const row = await pb
    .collection("billing")
    .getFirstListItem<Billing>(pb.filter("stripe_subscription = {:s}", { s: subscriptionId }))
    .catch(() => null);
  if (row) return row.owner;
  const sub = await getSubscription(subscriptionId).catch(() => null);
  return sub?.metadata?.user || null;
}

async function serverIp(): Promise<string> {
  if (process.env.SERVER_IP) return process.env.SERVER_IP;
  const ips = await resolve4(rootDomain()).catch(() => [] as string[]);
  if (!ips[0]) throw new Error("Set SERVER_IP: could not look up this server's address.");
  return ips[0];
}

/**
 * Buys a waiting domain once yearly Pro is paid: registers it with the author as registrant,
 * points it here and connects it to their site. Safe to call twice.
 */
export async function registerWaitingDomain(domainId: string): Promise<DomainRow> {
  const pb = await adminPb();
  const row = await pb.collection("domains").getOne<DomainRow>(domainId);
  if (row.status === "active" || row.status === "registering") return row;
  await pb.collection("domains").update(row.id, { status: "registering", error: "" });
  try {
    if (!namecomConfigured()) throw new Error("Domain buying is not set up on the server yet (NAMECOM_USERNAME / NAMECOM_TOKEN).");
    const out = await registerDomain(row.domain, row.price_cents / 100, row.registrant);
    await pointAt(row.domain, await serverIp());
    const site = await siteOf(row.owner);
    if (site) await pb.collection("site_settings").update(site.id, { custom_domain: row.domain });
    await saveBilling(row.owner, { free_domain_used: true });
    return pb.collection("domains").update<DomainRow>(row.id, {
      status: "active",
      registrar: "name.com",
      order_id: String(out.order ?? ""),
      expires: out.domain?.expireDate ? out.domain.expireDate.replace("T", " ") : "",
      autorenew: true,
    });
  } catch (e) {
    return pb.collection("domains").update<DomainRow>(row.id, { status: "failed", error: e instanceof Error ? e.message : String(e) });
  }
}
