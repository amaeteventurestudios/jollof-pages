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
  suspended?: boolean;
  /** the brand (white label) they signed up on, "" for Jollof Pages */
  brand?: string;
  created: string;
}
export interface AdminBook {
  owner: string;
  updated: string;
}
export interface AdminLog {
  owner: string;
  date: string;
  /** net words written that day, on one book */
  words?: number;
}
export interface AdminSite {
  id?: string;
  owner: string;
  publisher_name?: string;
  offline?: boolean;
  updated?: string;
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
  suspended: boolean;
  /** words written in the studio, all time (from the daily writing log) */
  words: number;
  /** reasons the account looks like a spam sign-up; empty when it doesn't */
  spam: string[];
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
  const words = new Map<string, number>();
  for (const l of d.log) {
    seen(l.owner, l.date);
    if ((l.words ?? 0) > 0) words.set(l.owner, (words.get(l.owner) ?? 0) + l.words!);
  }
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
        suspended: Boolean(u.suspended),
        words: words.get(u.id) ?? 0,
        spam: spamSigns(u, sites.get(u.id) ?? null, (books.get(u.id) ?? 0) + (words.get(u.id) ?? 0)),
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

/**
 * Why a sign-up looks like a bot: a name or site address of random letters (like
 * "kBnoeNrcwKEYVyfFBc"), an email with a dot between nearly every letter, and nothing done since.
 * Only a hint for the owner to look at; nothing is blocked automatically.
 */
export function spamSigns(u: Pick<AdminUser, "email" | "name" | "access">, site: Pick<AdminSite, "subdomain"> | null, activity: number): string[] {
  if (u.access === "paid") return [];
  const out: string[] = [];
  if (u.name && looksRandom(u.name)) out.push("Random-letter name");
  if (site?.subdomain && looksRandom(site.subdomain)) out.push("Random-letter site address");
  const local = u.email.split("@")[0] ?? "";
  const dots = (local.match(/\./g) ?? []).length;
  if (dots >= 4 && dots >= local.replace(/\./g, "").length / 3) out.push("Email full of dots");
  if (!out.length) return [];
  if (!activity) out.push("Nothing written");
  return out;
}

/** Long runs of letters that read like keyboard mashing: case flips mid-word, few vowels, consonant runs. */
export function looksRandom(s: string): boolean {
  const t = s.replace(/[^A-Za-z]/g, "");
  if (t.length < 8) return false;
  const flips = [...t].filter((c, i) => i > 0 && (c === c.toUpperCase()) !== (t[i - 1] === t[i - 1].toUpperCase())).length;
  const vowels = (t.match(/[aeiouy]/gi) ?? []).length / t.length;
  const run = Math.max(
    ...t
      .toLowerCase()
      .split(/[aeiouy]+/)
      .map((r) => r.length),
  );
  const words = s.trim().split(/\s+/).length;
  return (words === 1 && flips >= 4) || (vowels < 0.15 && t.length >= 10) || run >= 6;
}

// ---------------------------------------------------------------------------------------------
// Insights, websites and books: platform-wide counts. Nothing here reads what anyone wrote.

export interface InsightBook {
  id: string;
  owner: string;
  title: string;
  status?: string;
  published?: boolean;
  language?: string;
  categories?: string[] | null;
  format?: { trim?: string; hardcover?: boolean } | null;
  word_count?: number;
  page_count?: number;
  created: string;
  updated: string;
}

export interface InsightData {
  books: InsightBook[];
  chapters: { owner: string; book: string; word_count?: number }[];
  generations: { owner: string; status?: string; created: string }[];
  /** usage_stats rows: kind is e.g. "export", key what kind of export */
  usage: { owner?: string; date: string; kind: string; key?: string; count: number }[];
  assistant: { owner: string; role: string; created: string }[];
  comments: number;
  collaborations: number;
  siteStats: { owner: string; date: string; kind: string; count: number }[];
  subscribers: { owner?: string; unsubscribed?: boolean }[];
  domains: { owner: string; domain: string; status?: string; error?: string; updated?: string }[];
}

/** 7, 30, 90 or 365 days back from today, or 0 for all time. */
export type RangeDays = 7 | 30 | 90 | 365 | 0;
export const RANGES: { days: RangeDays; label: string }[] = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
  { days: 0, label: "All time" },
];
export const toRange = (v: unknown): RangeDays => ([7, 30, 90, 365, 0].includes(Number(v)) ? (Number(v) as RangeDays) : 30);

export interface Bucket {
  date: string;
  value: number;
}

export interface Insights {
  range: RangeDays;
  totals: {
    /** words in every manuscript on the platform right now */
    wordsOnPlatform: number;
    /** words written in the range (net additions per book per day, counted when positive) */
    wordsWritten: number;
    books: number;
    booksStarted: number;
    booksFinished: number;
    booksPublished: number;
    chapters: number;
    avgBookWords: number;
    avgBookPages: number;
    activeWriters7: number;
    activeWriters30: number;
    exports: number;
    covers: number;
    translations: number;
    aiAnswers: number;
    comments: number;
    collaborations: number;
  };
  exportsBy: [string, number][];
  translationsBy: [string, number][];
  words: Bucket[];
  signups: Bucket[];
  trims: [string, number][];
  languages: [string, number][];
  categories: [string, number][];
  statuses: [string, number][];
  /** writers who have access but haven't written a word */
  notStarted: { id: string; email: string; access: string; created: string }[];
  /** writers who wrote in the past but nothing in the last 30 days */
  quiet: { id: string; email: string; lastWrote: string; words: number }[];
  streaks: { id: string; email: string; days: number }[];
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);
export const sinceDate = (range: RangeDays, now = new Date()) => (range ? isoDay(new Date(now.getTime() - (range - 1) * 86400_000)) : "0000-00-00");

/** Day buckets for up to 90 days, week buckets (keyed by Monday) for longer ranges. */
export function buckets(range: RangeDays, now = new Date(), first?: string): Bucket[] {
  const today = isoDay(now);
  if (range && range <= 90) return Array.from({ length: range }, (_, i) => ({ date: isoDay(new Date(now.getTime() - (range - 1 - i) * 86400_000)), value: 0 }));
  const start = range ? sinceDate(range, now) : first && first < today ? first : sinceDate(90, now);
  const out: Bucket[] = [];
  for (let d = weekOf(start); d <= today; d = isoDay(new Date(new Date(d + "T12:00:00Z").getTime() + 7 * 86400_000))) out.push({ date: d, value: 0 });
  return out;
}

export function weekOf(day: string): string {
  const d = new Date(day + "T12:00:00Z");
  const back = (d.getUTCDay() + 6) % 7;
  return isoDay(new Date(d.getTime() - back * 86400_000));
}

function add(series: Bucket[], day: string, n: number) {
  if (!series.length || day < series[0].date) return;
  const weekly = series.length > 1 && series[1].date !== isoDay(new Date(new Date(series[0].date + "T12:00:00Z").getTime() + 86400_000));
  const key = weekly ? weekOf(day) : day;
  const hit = series.find((b) => b.date === key);
  if (hit) hit.value += n;
}

const tally = (items: (string | undefined | null)[], top = 10): [string, number][] => {
  const m = new Map<string, number>();
  for (const i of items) if (i) m.set(i, (m.get(i) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
};
const sumBy = (rows: { key?: string; count: number }[], top = 10): [string, number][] => {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.key || "other", (m.get(r.key || "other") ?? 0) + r.count);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
};

export function insights(d: AdminData, x: InsightData, range: RangeDays, now = new Date()): Insights {
  const since = sinceDate(range, now);
  const inRange = (iso: string) => iso.slice(0, 10) >= since;
  const email = new Map(d.users.map((u) => [u.id, u.email]));
  const firstDay = [...d.users.map((u) => u.created.slice(0, 10)), ...d.log.map((l) => l.date)].sort()[0];

  const words = buckets(range, now, firstDay);
  const signups = buckets(range, now, firstDay);
  let wordsWritten = 0;
  const active7 = new Set<string>();
  const active30 = new Set<string>();
  const byWriter = new Map<string, { last: string; words: number; days: Set<string> }>();
  for (const l of d.log) {
    const w = Math.max(0, l.words ?? 0);
    if (inRange(l.date)) {
      wordsWritten += w;
      add(words, l.date, w);
    }
    if (w <= 0) continue;
    if (l.date >= sinceDate(7, now)) active7.add(l.owner);
    if (l.date >= sinceDate(30, now)) active30.add(l.owner);
    const r = byWriter.get(l.owner) ?? { last: "", words: 0, days: new Set<string>() };
    r.words += w;
    r.days.add(l.date);
    if (l.date > r.last) r.last = l.date;
    byWriter.set(l.owner, r);
  }
  for (const u of d.users) if (inRange(u.created)) add(signups, u.created.slice(0, 10), 1);

  const books = x.books;
  const finished = books.filter((b) => b.status === "ready" || b.status === "published" || b.published);
  const sized = books.filter((b) => (b.word_count ?? 0) > 0);
  const usage = x.usage.filter((r) => inRange(r.date));
  const exportsRows = usage.filter((r) => r.kind === "export");
  const translateRows = usage.filter((r) => r.kind === "translate");

  const streakOf = (days: Set<string>) => {
    let best = 0;
    let cur = 0;
    let prev = "";
    for (const day of [...days].sort()) {
      cur = prev && isoDay(new Date(new Date(prev + "T12:00:00Z").getTime() + 86400_000)) === day ? cur + 1 : 1;
      best = Math.max(best, cur);
      prev = day;
    }
    return best;
  };

  return {
    range,
    totals: {
      wordsOnPlatform: x.chapters.reduce((s, c) => s + (c.word_count ?? 0), 0),
      wordsWritten,
      books: books.length,
      booksStarted: books.filter((b) => inRange(b.created)).length,
      booksFinished: finished.filter((b) => inRange(b.updated)).length,
      booksPublished: books.filter((b) => b.published).length,
      chapters: x.chapters.length,
      avgBookWords: sized.length ? Math.round(sized.reduce((s, b) => s + (b.word_count ?? 0), 0) / sized.length) : 0,
      avgBookPages: sized.length ? Math.round(sized.reduce((s, b) => s + (b.page_count ?? 0), 0) / sized.length) : 0,
      activeWriters7: active7.size,
      activeWriters30: active30.size,
      exports: exportsRows.reduce((s, r) => s + r.count, 0),
      covers: x.generations.filter((g) => g.status === "done" && inRange(g.created)).length,
      translations: translateRows.reduce((s, r) => s + r.count, 0),
      aiAnswers: x.assistant.filter((m) => m.role === "assistant" && inRange(m.created)).length,
      comments: x.comments,
      collaborations: x.collaborations,
    },
    exportsBy: sumBy(exportsRows),
    translationsBy: sumBy(translateRows),
    words,
    signups,
    trims: tally(books.map((b) => b.format?.trim)),
    languages: tally(books.map((b) => b.language || "en")),
    categories: tally(books.flatMap((b) => b.categories ?? []).map((c) => String(c).split(/\s*\/\s*/)[0])),
    statuses: tally(books.map((b) => b.status || "drafting")),
    notStarted: d.users
      .filter((u) => (u.access === "paid" || u.access === "comp") && !byWriter.has(u.id))
      .map((u) => ({ id: u.id, email: u.email, access: u.access!, created: u.created }))
      .sort((a, b) => b.created.localeCompare(a.created))
      .slice(0, 50),
    quiet: [...byWriter.entries()]
      .filter(([, r]) => r.last < sinceDate(30, now))
      .map(([id, r]) => ({ id, email: email.get(id) ?? "", lastWrote: r.last, words: r.words }))
      .sort((a, b) => b.words - a.words)
      .slice(0, 50),
    streaks: [...byWriter.entries()]
      .map(([id, r]) => ({ id, email: email.get(id) ?? "", days: streakOf(r.days) }))
      .filter((s) => s.days > 1)
      .sort((a, b) => b.days - a.days)
      .slice(0, 10),
  };
}

export type DomainState = "none" | "connected" | "waiting" | "failed";

export interface Website {
  id: string;
  owner: string;
  email: string;
  name: string;
  subdomain: string;
  customDomain: string;
  home: boolean;
  pro: boolean;
  proUntil: string;
  offline: boolean;
  suspended: boolean;
  domain: DomainState;
  domainNote: string;
  views: number;
  visitors: number;
  signups: number;
  storeClicks: number;
  sales: number;
  books: number;
  subscribers: number;
  orders: number;
  updated: string;
  spam: boolean;
}

/** Every author site with its traffic over the range (site_stats must already be cut to it). */
export function websites(d: AdminData, x: InsightData): Website[] {
  const users = new Map(d.users.map((u) => [u.id, u]));
  const stat = new Map<string, Record<string, number>>();
  for (const s of x.siteStats) {
    const m = stat.get(s.owner) ?? {};
    m[s.kind] = (m[s.kind] ?? 0) + s.count;
    stat.set(s.owner, m);
  }
  const published = new Map<string, number>();
  for (const b of x.books) if (b.published) published.set(b.owner, (published.get(b.owner) ?? 0) + 1);
  const subs = new Map<string, number>();
  for (const s of x.subscribers) if (s.owner && !s.unsubscribed) subs.set(s.owner, (subs.get(s.owner) ?? 0) + 1);
  const orders = new Map<string, number>();
  for (const o of d.orders) orders.set(o.owner, (orders.get(o.owner) ?? 0) + 1);
  const lastBook = new Map<string, string>();
  for (const b of x.books) if (b.updated > (lastBook.get(b.owner) ?? "")) lastBook.set(b.owner, b.updated);
  const now = Date.now();
  return d.sites
    .filter((s) => s.home || s.subdomain || s.custom_domain)
    .map((s) => {
      const u = users.get(s.owner);
      const st = stat.get(s.owner) ?? {};
      const dom = x.domains.filter((r) => r.owner === s.owner).sort((a, b) => (b.updated ?? "").localeCompare(a.updated ?? ""))[0];
      let domain: DomainState = "none";
      let domainNote = "";
      if (s.custom_domain) {
        domain = "connected";
        domainNote = s.custom_domain;
      } else if (dom) {
        domain = dom.status === "failed" || dom.status === "lapsed" ? "failed" : dom.status === "active" ? "connected" : "waiting";
        domainNote = dom.error || `${dom.domain}: ${dom.status?.replace("_", " ") ?? ""}`;
      }
      const proUntil = s.pro_until ?? "";
      return {
        id: s.id ?? s.owner,
        owner: s.owner,
        email: u?.email ?? "",
        name: s.publisher_name || u?.name || "",
        subdomain: s.subdomain ?? "",
        customDomain: s.custom_domain ?? "",
        home: Boolean(s.home),
        pro: Boolean(s.home) || (proUntil ? new Date(proUntil.replace(" ", "T")).getTime() > now : false),
        proUntil,
        offline: Boolean(s.offline),
        suspended: Boolean(u?.suspended),
        domain,
        domainNote,
        views: st.view ?? 0,
        visitors: st.visitor ?? 0,
        signups: st.signup ?? 0,
        storeClicks: st.buy_click ?? 0,
        sales: st.sale ?? 0,
        books: published.get(s.owner) ?? 0,
        subscribers: subs.get(s.owner) ?? 0,
        orders: orders.get(s.owner) ?? 0,
        updated: [s.updated ?? "", lastBook.get(s.owner) ?? ""].sort().pop() || "",
        spam: u ? spamSigns(u, s, published.get(s.owner) ?? 0).length > 0 : false,
      };
    })
    .sort((a, b) => b.visitors - a.visitors || b.updated.localeCompare(a.updated));
}

export interface BookRow {
  id: string;
  title: string;
  owner: string;
  email: string;
  status: string;
  published: boolean;
  language: string;
  trim: string;
  words: number;
  pages: number;
  created: string;
  updated: string;
}

/** The platform's books by title and numbers only. */
export function bookRows(d: AdminData, x: InsightData): BookRow[] {
  const email = new Map(d.users.map((u) => [u.id, u.email]));
  return x.books
    .map((b) => ({
      id: b.id,
      title: b.title,
      owner: b.owner,
      email: email.get(b.owner) ?? "",
      status: b.status || "drafting",
      published: Boolean(b.published),
      language: b.language || "en",
      trim: b.format?.trim ?? "",
      words: b.word_count ?? 0,
      pages: b.page_count ?? 0,
      created: b.created,
      updated: b.updated,
    }))
    .sort((a, b) => b.updated.localeCompare(a.updated));
}

export interface NeedItem {
  kind: "ticket" | "idea" | "spam" | "domain" | "nosite" | "notstarted";
  label: string;
  count: number;
  href: string;
}

/** What is waiting on the owner, most urgent first. Items with nothing waiting are left out. */
export function needsYou(o: Overview, list: Writer[], sites: Website[] | null): NeedItem[] {
  const spam = list.filter((w) => w.spam.length && !w.suspended).length;
  const items: NeedItem[] = [
    { kind: "ticket", label: "Support tickets waiting for an answer", count: o.tickets.open, href: "/studio/admin/support" },
    { kind: "spam", label: "Sign-ups that look like spam", count: spam, href: "/studio/admin/writers?show=spam" },
    { kind: "idea", label: "New feature ideas to review", count: o.ideas.new, href: "/studio/admin/support" },
  ];
  if (sites) {
    items.push({
      kind: "domain",
      label: "Own domains not connected yet",
      count: sites.filter((s) => s.domain === "waiting" || s.domain === "failed").length,
      href: "/studio/admin/websites?show=domains",
    });
    items.push({ kind: "nosite", label: "Websites with no books on them", count: sites.filter((s) => !s.books && !s.home && !s.offline).length, href: "/studio/admin/websites?show=empty" });
  }
  return items.filter((i) => i.count > 0);
}

/** A CSV file from rows, for the Download buttons. */
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : Array.isArray(v) ? v.join("; ") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\n");
}
