/**
 * Newsletter emails. Every Author Site Pro account gets its own monthly allowance (one email
 * per reader per send), and can buy extra emails that never expire. All mail goes out through
 * the one Resend account on the server; the allowance keeps one author from using up everyone's.
 */

export interface EmailPack {
  id: string;
  emails: number;
  cents: number;
  label: string;
}

export const EMAIL_PACKS: EmailPack[] = [
  { id: "e10k", emails: 10_000, cents: 600, label: "$6" },
  { id: "e100k", emails: 100_000, cents: 5400, label: "$54" },
];

export const DEFAULT_MONTHLY_EMAILS = 5000;

export function monthlyAllowance(raw: string | undefined = process.env.NEWSLETTER_MONTHLY_EMAILS): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && raw !== undefined && raw !== "" ? Math.floor(n) : DEFAULT_MONTHLY_EMAILS;
}

/** The first moment of this calendar month and of the next, in UTC. */
export function monthBounds(now = new Date()): { start: Date; next: Date } {
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    next: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export interface EmailQuota {
  allowance: number;
  /** emails sent from this month's allowance so far */
  used: number;
  /** bought emails left (they carry over) */
  extra: number;
  /** ISO date the allowance refills */
  resets: string;
  unlimited?: boolean;
}

export const allowanceLeft = (q: EmailQuota) => Math.max(0, q.allowance - q.used);
export const emailsLeft = (q: EmailQuota) => (q.unlimited ? Infinity : allowanceLeft(q) + q.extra);

/** How a send of `count` emails is paid for: the monthly allowance first, then bought emails. */
export function planSend(q: EmailQuota, count: number): { ok: boolean; fromAllowance: number; fromExtra: number; short: number } {
  if (q.unlimited) return { ok: true, fromAllowance: count, fromExtra: 0, short: 0 };
  const fromAllowance = Math.min(count, allowanceLeft(q));
  const fromExtra = Math.min(count - fromAllowance, q.extra);
  const short = count - fromAllowance - fromExtra;
  return { ok: short === 0, fromAllowance, fromExtra, short };
}
