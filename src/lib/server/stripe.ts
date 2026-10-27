import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { CreditPack } from "../cover-ai";

/**
 * Stripe Checkout for credit top-ups: one-off payments, no subscriptions, no Stripe SDK.
 * Uses STRIPE_SECRET_KEY (sk_test_… while testing) and STRIPE_WEBHOOK_SECRET (whsec_…).
 */

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

async function stripe<T>(path: string, init?: { method?: string; form?: Record<string, string> }): Promise<T> {
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
  payment_status: "paid" | "unpaid" | "no_payment_required";
  client_reference_id: string | null;
  amount_total: number | null;
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
