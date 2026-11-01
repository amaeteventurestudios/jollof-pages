import "server-only";
import { adminPb, isFree } from "./credits";
import { monthBounds, monthlyAllowance, type EmailQuota } from "../email-quota";

const pbDate = (d: Date) => d.toISOString().replace("T", " ");

/**
 * An author's newsletter emails: this month's use (summed from sent newsletters, each email
 * counted once) and the bought emails left in email_ledger. The publisher's own accounts
 * (COVER_AI_FREE_EMAILS) send without a limit.
 */
export async function emailQuota(user: { id: string; email: string }, now = new Date()): Promise<EmailQuota> {
  const pb = await adminPb();
  const { start, next } = monthBounds(now);
  const resets = next.toISOString().slice(0, 10);
  const allowance = monthlyAllowance();
  if (isFree(user.email)) return { allowance, used: 0, extra: 0, resets, unlimited: true };
  const [letters, ledger] = await Promise.all([
    pb.collection("newsletters").getFullList<{ sent_count: number; from_extra: number }>({
      filter: pb.filter("owner = {:u} && sent_at >= {:s} && sent_count > 0 && own_account != true", { u: user.id, s: pbDate(start) }),
      fields: "sent_count,from_extra",
    }),
    pb.collection("email_ledger").getFullList<{ delta: number }>({ filter: pb.filter("owner = {:u}", { u: user.id }), fields: "delta" }),
  ]);
  // emails paid for from bought ones do not count against the allowance
  const used = letters.reduce((s, l) => s + Math.max(0, (l.sent_count || 0) - (l.from_extra || 0)), 0);
  const extra = Math.max(0, ledger.reduce((s, r) => s + (r.delta || 0), 0));
  return { allowance, used, extra, resets, packs: process.env.NEWSLETTER_SELL_EMAILS === "1" };
}

/** Credits a paid Checkout session for extra emails once. Returns false when it was already credited. */
export async function creditEmailTopup(s: { sessionId: string; userId: string; emails: number; cents: number }): Promise<boolean> {
  const pb = await adminPb();
  const seen = await pb
    .collection("email_ledger")
    .getList(1, 1, { filter: pb.filter("stripe_session = {:s}", { s: s.sessionId }) })
    .catch(() => ({ totalItems: 0 }));
  if (seen.totalItems) return false;
  try {
    await pb.collection("email_ledger").create({ owner: s.userId, delta: s.emails, reason: "topup", stripe_session: s.sessionId, amount_cents: s.cents, note: `${s.emails} emails` });
    return true;
  } catch {
    // the unique index on stripe_session caught a webhook and a return visit racing each other
    return false;
  }
}

export async function spendExtraEmails(userId: string, emails: number, newsletter: string) {
  if (emails <= 0) return;
  const pb = await adminPb();
  await pb.collection("email_ledger").create({ owner: userId, delta: -emails, reason: "send", newsletter, note: `${emails} emails` });
}
