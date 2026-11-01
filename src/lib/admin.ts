/**
 * The owner's admin: who signed up, who paid, and what came in. The server gathers the rows
 * (src/lib/server/admin.ts); the sums live here so they can be tested without a database.
 */

/** "collaborator" accounts were invited to help on someone else's book and have no studio of their own. */
export type Access = "pending" | "paid" | "comp" | "collaborator";

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  access?: Access | "";
  paid_cents?: number;
  paid_at?: string;
  /** the tester invite link they signed up through, if any */
  tester_invite?: string;
  created: string;
}
export interface AdminBook {
  owner: string;
  updated: string;
}
export interface AdminLog {
  owner: string;
  date: string;
}
export interface AdminSite {
  owner: string;
  subdomain?: string;
  home?: boolean;
  custom_domain?: string;
  pro_until?: string;
}
export interface AdminLedger {
  id: string;
  owner: string;
  delta: number;
  reason: "topup" | "generation" | "refund" | "grant";
  amount_cents?: number;
  note?: string;
  created: string;
}
export interface AdminOrder {
  id: string;
  owner: string;
  amount_cents: number;
  fee_cents: number;
  email?: string;
  created: string;
}
export interface AdminBilling {
  owner: string;
  status?: string;
  interval?: "month" | "year" | "";
}

export interface AdminData {
  users: AdminUser[];
  books: AdminBook[];
  log: AdminLog[];
  sites: AdminSite[];
  ledger: AdminLedger[];
  orders: AdminOrder[];
  billing: AdminBilling[];
  tickets: { status: string; owner?: string }[];
  ideas: { status: string; owner?: string }[];
}

export interface Overview {
  writers: { total: number; paid: number; comp: number; pending: number; collaborator: number; testers: number; new7: number; new30: number };
  /** the last 30 days, oldest first */
  signups: { date: string; count: number }[];
  money: {
    studioCents: number;
    studioCount: number;
    creditCents: number;
    creditCount: number;
    creditsUsed: number;
    ebookCents: number;
    ebookFeeCents: number;
    ebookCount: number;
    proMonthly: number;
    proYearly: number;
    /** paid this calendar month, studio + credits + ebook fees */
    thisMonthCents: number;
  };
  books: number;
  tickets: { open: number; answered: number };
  ideas: { new: number; total: number };
}

export interface Writer {
  id: string;
  email: string;
  name: string;
  access: Access;
  created: string;
  paidCents: number;
  books: number;
  lastActive: string;
  site: AdminSite | null;
  pro: boolean;
  credits: number;
  spentCents: number;
  /** id of the tester invite link they joined through, "" if none */
  tester: string;
  /** support tickets they opened and feature ideas they posted: a tester's feedback */
  tickets: number;
  ideas: number;
}

export type MoneyKind = "studio" | "credits" | "ebook";
export interface Payment {
  id: string;
  kind: MoneyKind;
  owner: string;
  email: string;
  cents: number;
  /** what the platform keeps: everything for studio and credits, the fee for an ebook */
  keepCents: number;
  note: string;
  at: string;
}

const day = (iso: string) => iso.slice(0, 10);
const ACTIVE = new Set(["active", "trialing", "past_due", "canceling"]);

/** Paid users with no recorded amount predate the payments field; count them at the list price. */
export function studioCents(u: AdminUser, listPrice: number): number {
  return u.access === "paid" ? u.paid_cents || listPrice : 0;
}

export function overview(d: AdminData, listPrice: number, now = new Date()): Overview {
  const today = day(now.toISOString());
  const ago = (n: number) => day(new Date(now.getTime() - n * 86400_000).toISOString());
  const month = today.slice(0, 7);
  const signups = Array.from({ length: 30 }, (_, i) => ({ date: ago(29 - i), count: 0 }));
  const byDay = new Map(signups.map((s) => [s.date, s]));
  const w = { total: d.users.length, paid: 0, comp: 0, pending: 0, collaborator: 0, testers: 0, new7: 0, new30: 0 };
  const m: Overview["money"] = {
    studioCents: 0,
    studioCount: 0,
    creditCents: 0,
    creditCount: 0,
    creditsUsed: 0,
    ebookCents: 0,
    ebookFeeCents: 0,
    ebookCount: 0,
    proMonthly: 0,
    proYearly: 0,
    thisMonthCents: 0,
  };
  for (const u of d.users) {
    const a = u.access || "pending";
    if (a in w) w[a]++;
    if (u.tester_invite) w.testers++;
    const c = day(u.created);
    if (c > ago(7)) w.new7++;
    if (c > ago(30)) w.new30++;
    const hit = byDay.get(c);
    if (hit) hit.count++;
    const cents = studioCents(u, listPrice);
    if (cents) {
      m.studioCents += cents;
      m.studioCount++;
      if ((u.paid_at || u.created).slice(0, 7) === month) m.thisMonthCents += cents;
    }
  }
  for (const l of d.ledger) {
    if (l.reason === "topup") {
      m.creditCents += l.amount_cents || 0;
      m.creditCount++;
      if (l.created.slice(0, 7) === month) m.thisMonthCents += l.amount_cents || 0;
    } else if (l.reason === "generation") m.creditsUsed -= l.delta;
    else if (l.reason === "refund") m.creditsUsed -= l.delta;
  }
  for (const o of d.orders) {
    m.ebookCents += o.amount_cents;
    m.ebookFeeCents += o.fee_cents;
    m.ebookCount++;
    if (o.created.slice(0, 7) === month) m.thisMonthCents += o.fee_cents;
  }
  for (const b of d.billing) {
    if (!ACTIVE.has(b.status ?? "")) continue;
    if (b.interval === "year") m.proYearly++;
    else m.proMonthly++;
  }
  return {
    writers: w,
    signups,
    money: m,
    books: d.books.length,
    tickets: { open: d.tickets.filter((t) => t.status === "open").length, answered: d.tickets.filter((t) => t.status === "answered").length },
    ideas: { new: d.ideas.filter((i) => i.status === "new").length, total: d.ideas.length },
  };
}

export function writers(d: AdminData, listPrice: number): Writer[] {
  const books = new Map<string, number>();
  const last = new Map<string, string>();
  const seen = (owner: string, at: string) => at > (last.get(owner) ?? "") && last.set(owner, at);
  for (const b of d.books) {
    books.set(b.owner, (books.get(b.owner) ?? 0) + 1);
    seen(b.owner, b.updated);
  }
  for (const l of d.log) seen(l.owner, l.date);
  const sites = new Map(d.sites.map((s) => [s.owner, s]));
  const count = (rows: { owner?: string }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) if (r.owner) m.set(r.owner, (m.get(r.owner) ?? 0) + 1);
    return m;
  };
  const tickets = count(d.tickets);
  const ideas = count(d.ideas);
  const pro = new Set(d.billing.filter((b) => ACTIVE.has(b.status ?? "")).map((b) => b.owner));
  const credits = new Map<string, number>();
  const spent = new Map<string, number>();
  for (const l of d.ledger) {
    credits.set(l.owner, (credits.get(l.owner) ?? 0) + (l.delta || 0));
    if (l.reason === "topup") spent.set(l.owner, (spent.get(l.owner) ?? 0) + (l.amount_cents || 0));
  }
  return d.users
    .map((u) => {
      const paidCents = studioCents(u, listPrice);
      return {
        id: u.id,
        email: u.email,
        name: u.name ?? "",
        access: u.access || "pending",
        created: u.created,
        paidCents,
        books: books.get(u.id) ?? 0,
        lastActive: last.get(u.id) ?? u.created,
        site: sites.get(u.id) ?? null,
        pro: pro.has(u.id),
        credits: credits.get(u.id) ?? 0,
        spentCents: paidCents + (spent.get(u.id) ?? 0),
        tester: u.tester_invite ?? "",
        tickets: tickets.get(u.id) ?? 0,
        ideas: ideas.get(u.id) ?? 0,
      };
    })
    .sort((a, b) => b.created.localeCompare(a.created));
}

/** Every payment, newest first. */
export function payments(d: AdminData, listPrice: number): Payment[] {
  const email = new Map(d.users.map((u) => [u.id, u.email]));
  const out: Payment[] = [];
  for (const u of d.users) {
    const cents = studioCents(u, listPrice);
    if (cents)
      out.push({ id: `s-${u.id}`, kind: "studio", owner: u.id, email: u.email, cents, keepCents: cents, note: u.paid_cents ? "Studio" : "Studio (amount not recorded)", at: u.paid_at || u.created });
  }
  for (const l of d.ledger)
    if (l.reason === "topup")
      out.push({ id: l.id, kind: "credits", owner: l.owner, email: email.get(l.owner) ?? "", cents: l.amount_cents || 0, keepCents: l.amount_cents || 0, note: `${l.delta} credits`, at: l.created });
  for (const o of d.orders)
    out.push({
      id: o.id,
      kind: "ebook",
      owner: o.owner,
      email: email.get(o.owner) ?? "",
      cents: o.amount_cents,
      keepCents: o.fee_cents,
      note: o.email ? `Ebook sold to ${o.email}` : "Ebook sale",
      at: o.created,
    });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

export const money = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
