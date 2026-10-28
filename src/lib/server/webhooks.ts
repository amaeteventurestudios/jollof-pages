import "server-only";
import { creditTopup } from "./credits";
import { markStudioPaid } from "./accounts";
import { ownerOfSubscription, registerWaitingDomain, saveBilling, syncSubscription, syncSubscriptionById } from "./pro";
import { recordSale } from "./ebooks";
import type { CheckoutSession, Subscription } from "./stripe";

/** What a finished Checkout pays for, by its metadata kind. Every branch is safe to run twice. */
export async function handleCheckoutSession(s: CheckoutSession): Promise<void> {
  if (s.payment_status !== "paid") return;
  const kind = s.metadata?.kind;
  const user = s.client_reference_id || s.metadata?.user || "";
  if (kind === "cover-credits" && user) await creditTopup({ sessionId: s.id, userId: user, credits: Number(s.metadata.credits) || 0, cents: s.amount_total ?? 0 });
  else if (kind === "studio" && user) await markStudioPaid(user, s.amount_total ?? 0);
  else if (kind === "pro" && user && s.subscription) {
    if (s.customer) await saveBilling(user, { stripe_customer: s.customer });
    await syncSubscriptionById(user, s.subscription);
    if (s.metadata.domain) await registerWaitingDomain(s.metadata.domain);
  } else if (kind === "ebook") await recordSale(s);
}

interface Invoice {
  subscription?: string | null;
  parent?: { subscription_details?: { subscription?: string } } | null;
}

/** Stripe events this app listens to; see docs/author-sites.md for the list to enable. */
export async function handleEvent(event: { type: string; data: { object: unknown } }): Promise<void> {
  const o = event.data.object;
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return handleCheckoutSession(o as CheckoutSession);
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const inv = o as Invoice;
      const subId = inv.subscription || inv.parent?.subscription_details?.subscription;
      if (!subId) return;
      const owner = await ownerOfSubscription(subId);
      if (owner) await syncSubscriptionById(owner, subId);
      return;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = o as Subscription;
      const owner = sub.metadata?.user || (await ownerOfSubscription(sub.id));
      if (owner) await syncSubscription(owner, sub);
      return;
    }
  }
}
