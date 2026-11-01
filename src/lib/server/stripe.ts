import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { CreditPack } from "../cover-ai";
import type { EmailPack } from "../email-quota";

/**
 * Stripe Checkout for credit top-ups: one-off payments, no subscriptions, no Stripe SDK.
 * Uses STRIPE_SECRET_KEY (sk_test_… while testing) and STRIPE_WEBHOOK_SECRET (whsec_…).
 */

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function stripe<T>(path: string, init?: { method?: string; form?: Record<string, string> }): Promise<T> {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: init?.form ? new URLSearchParams(init.form).toString() : undefined,
  });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Stripe: ${body.error?.message ?? res.status}`);
  return body;
}

export interface CheckoutSession {
  id: string;
  url: string | null;
  mode?: "payment" | "subscription" | "setup";
  payment_status: "paid" | "unpaid" | "no_payment_required";
  client_reference_id: string | null;
  amount_total: number | null;
  currency?: string | null;
  customer?: string | null;
  subscription?: string | null;
  customer_details?: { email?: string | null } | null;
  metadata: Record<string, string>;
}

export function createCheckout(p: { pack: CreditPack; userId: string; email: string; successUrl: string; cancelUrl: string }) {
  return stripe<CheckoutSession>("checkout/sessions", {
    method: "POST",
    form: {
      mode: "payment",
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      client_reference_id: p.userId,
      ...(p.email ? { customer_email: p.email } : {}),
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(p.pack.cents),
      "line_items[0][price_data][product_data][name]": `${p.pack.credits} AI cover credits`,
      "line_items[0][price_data][product_data][description]": "Jollof Pages studio. Pay as you go: credits never expire.",
      "metadata[user]": p.userId,
      "metadata[credits]": String(p.pack.credits),
      "metadata[kind]": "cover-credits",
    },
  });
}

/** Extra newsletter emails on top of the monthly allowance; they never expire. */
export function createEmailCheckout(p: { pack: EmailPack; userId: string; email: string; successUrl: string; cancelUrl: string }) {
  return stripe<CheckoutSession>("checkout/sessions", {
    method: "POST",
    form: {
      mode: "payment",
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      client_reference_id: p.userId,
      ...(p.email ? { customer_email: p.email } : {}),
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(p.pack.cents),
      "line_items[0][price_data][product_data][name]": `${p.pack.emails.toLocaleString("en-US")} newsletter emails`,
      "line_items[0][price_data][product_data][description]": "Jollof Pages newsletters. Used after your monthly allowance; they never expire.",
      "metadata[user]": p.userId,
      "metadata[emails]": String(p.pack.emails),
      "metadata[kind]": "email-credits",
    },
  });
}

export function getCheckout(id: string) {
  return stripe<CheckoutSession>(`checkout/sessions/${encodeURIComponent(id)}`);
}

/** Checks the Stripe-Signature header: t=timestamp,v1=hex HMAC-SHA256 of `${t}.${body}`. */
export function verifyWebhook(payload: string, header: string | null, secret: string, toleranceSec = 300, now = Date.now()): boolean {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length) return false;
  if (Math.abs(now / 1000 - Number(t)) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${payload}`).digest();
  return sigs.some((s) => {
    const got = Buffer.from(s, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

/**
 * The studio itself: one payment of $129, a lifetime account. Fixed here, not in the server's
 * environment, so the sign-up page, Stripe and the sales page can never show different prices.
 */
export function studioPriceCents(): number {
  return 12900;
}

/** The studio price on a brand (white label), or the Jollof Pages price. */
export function brandPriceCents(brand?: { price_cents?: number } | null): number {
  return brand?.price_cents || studioPriceCents();
}

export function createStudioCheckout(p: { userId: string; email: string; successUrl: string; cancelUrl: string; brand?: { name: string; price_cents?: number } | null }) {
  return stripe<CheckoutSession>("checkout/sessions", {
    method: "POST",
    form: {
      mode: "payment",
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      client_reference_id: p.userId,
      ...(p.email ? { customer_email: p.email } : {}),
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(brandPriceCents(p.brand)),
      "line_items[0][price_data][product_data][name]": `${p.brand?.name || "Jollof Pages"} studio`,
      "line_items[0][price_data][product_data][description]": "One-time payment. Your writing studio and your own author website, for life.",
      "metadata[user]": p.userId,
      "metadata[kind]": "studio",
    },
  });
}

// ---------- Author Site Pro: a subscription ----------

export type ProInterval = "month" | "year";

/** PRO_MONTH_CENTS (default $10) and PRO_YEAR_CENTS (default $96). */
export function proPriceCents(interval: ProInterval): number {
  return interval === "year" ? Number(process.env.PRO_YEAR_CENTS) || 9600 : Number(process.env.PRO_MONTH_CENTS) || 1000;
}

export function createProCheckout(p: { userId: string; email: string; customer?: string; interval: ProInterval; domainId?: string; successUrl: string; cancelUrl: string }) {
  const meta: Record<string, string> = { "metadata[user]": p.userId, "metadata[kind]": "pro", "metadata[interval]": p.interval };
  if (p.domainId) meta["metadata[domain]"] = p.domainId;
  return stripe<CheckoutSession>("checkout/sessions", {
    method: "POST",
    form: {
      mode: "subscription",
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      client_reference_id: p.userId,
      ...(p.customer ? { customer: p.customer } : p.email ? { customer_email: p.email } : {}),
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(proPriceCents(p.interval)),
      "line_items[0][price_data][recurring][interval]": p.interval,
      "line_items[0][price_data][product_data][name]": "Author Site Pro",
      ...meta,
      "subscription_data[metadata][user]": p.userId,
      "subscription_data[metadata][kind]": "pro",
    },
  });
}

export interface Subscription {
  id: string;
  status: string;
  customer: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  metadata: Record<string, string>;
  items: { data: { current_period_end?: number; price?: { recurring?: { interval?: ProInterval } } }[] };
}

export function getSubscription(id: string) {
  return stripe<Subscription>(`subscriptions/${encodeURIComponent(id)}`);
}

/** End of the paid period in ms; newer API versions keep it on the subscription item. */
export function periodEnd(sub: Subscription): number {
  const s = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end ?? 0;
  return s * 1000;
}

export function intervalOf(sub: Subscription): ProInterval {
  return sub.items?.data?.[0]?.price?.recurring?.interval === "year" ? "year" : "month";
}

export function createPortal(customer: string, returnUrl: string) {
  return stripe<{ url: string }>("billing_portal/sessions", { method: "POST", form: { customer, return_url: returnUrl } });
}

// ---------- ebook sales paid to the author (Stripe Connect, Express accounts) ----------

export function createExpressAccount(email: string) {
  return stripe<{ id: string }>("accounts", {
    method: "POST",
    form: {
      type: "express",
      ...(email ? { email } : {}),
      "capabilities[card_payments][requested]": "true",
      "capabilities[transfers][requested]": "true",
    },
  });
}

export function accountLink(account: string, refreshUrl: string, returnUrl: string) {
  return stripe<{ url: string }>("account_links", { method: "POST", form: { account, refresh_url: refreshUrl, return_url: returnUrl, type: "account_onboarding" } });
}

export function getAccount(id: string) {
  return stripe<{ id: string; charges_enabled: boolean; payouts_enabled: boolean; details_submitted: boolean }>(`accounts/${encodeURIComponent(id)}`);
}

/**
 * The platform's cut of a direct ebook sale. With destination charges the platform pays
 * Stripe's card fee, so the default (EBOOK_FEE_PERCENT 3 + EBOOK_FEE_FIXED_CENTS 30) only covers it.
 */
export function ebookFeeCents(price: number): number {
  const pct = process.env.EBOOK_FEE_PERCENT ? Number(process.env.EBOOK_FEE_PERCENT) : 3;
  const fixed = process.env.EBOOK_FEE_FIXED_CENTS ? Number(process.env.EBOOK_FEE_FIXED_CENTS) : 30;
  return Math.min(price, Math.round((price * pct) / 100 + fixed));
}

export function createEbookCheckout(p: { book: { id: string; title: string; owner: string }; priceCents: number; account: string; successUrl: string; cancelUrl: string }) {
  return stripe<CheckoutSession>("checkout/sessions", {
    method: "POST",
    form: {
      mode: "payment",
      success_url: p.successUrl,
      cancel_url: p.cancelUrl,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(p.priceCents),
      "line_items[0][price_data][product_data][name]": `${p.book.title} (ebook)`,
      "line_items[0][price_data][product_data][description]": "EPUB, readable on Apple Books, Kobo, Google Play Books and most reading apps. Download straight after paying.",
      "payment_intent_data[application_fee_amount]": String(ebookFeeCents(p.priceCents)),
      "payment_intent_data[transfer_data][destination]": p.account,
      "metadata[kind]": "ebook",
      "metadata[book]": p.book.id,
      "metadata[owner]": p.book.owner,
    },
  });
}
