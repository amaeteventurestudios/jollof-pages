import "server-only";
import { adminPb } from "./credits";
import { resend, type Sender } from "./mail";
import { seal, unseal } from "./secret-box";
import type { DnsRecord, MailAccount } from "../mail-account";

/**
 * An author's own Resend account. Every Resend account has its own free allowance, so an author
 * who connects one sends their newsletters on it, from a domain they verify there, and nothing
 * comes out of the publisher's shared account.
 */

interface Row {
  id: string;
  owner: string;
  key_sealed: string;
  key_hint: string;
  domain: string;
  domain_id: string;
  status: string;
  records: DnsRecord[] | null;
  from_local: string;
}

interface ResendDomain {
  id: string;
  name: string;
  status: string;
  records?: DnsRecord[];
}

const DOMAIN = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export function cleanDomain(raw: string): string | null {
  const d = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
  return DOMAIN.test(d) ? d : null;
}

async function row(userId: string): Promise<Row | null> {
  const pb = await adminPb();
  return pb
    .collection("mail_accounts")
    .getFirstListItem<Row>(pb.filter("owner = {:u}", { u: userId }))
    .catch(() => null);
}

const view = (r: Row | null): MailAccount =>
  r
    ? { connected: true, keyHint: r.key_hint, domain: r.domain, status: r.status, verified: r.status === "verified", records: r.records ?? [], fromLocal: r.from_local }
    : { connected: false };

export async function mailAccount(userId: string): Promise<MailAccount> {
  return view(await row(userId));
}

/** The author's verified account to send with, or null to use the shared one. */
export async function authorSender(userId: string): Promise<(Sender & { fromLocal: string }) | null> {
  const r = await row(userId);
  if (!r || r.status !== "verified") return null;
  const key = unseal(r.key_sealed);
  return key ? { key, domain: r.domain, fromLocal: r.from_local } : null;
}

/**
 * Connects an author's key and sending domain: checks the key, finds the domain in their Resend
 * account or adds it, and keeps the DNS records Resend asks for.
 */
export async function connectMailAccount(userId: string, input: { key: string; domain: string; fromLocal?: string }): Promise<MailAccount> {
  const key = input.key.trim();
  if (!/^re_[A-Za-z0-9_]{8,}$/.test(key)) throw new Error("That doesn't look like a Resend key. It starts with re_.");
  const domain = cleanDomain(input.domain);
  if (!domain) throw new Error("Enter a domain you own, such as mail.yourname.com.");
  if (/(^|\.)jollofpages\.com$/.test(domain)) throw new Error("Use a domain of your own, not a jollofpages.com address.");
  const fromLocal = (input.fromLocal || "news").toLowerCase().replace(/[^a-z0-9.-]/g, "").slice(0, 40) || "news";

  let list: { data?: ResendDomain[] };
  try {
    list = await resend<{ data?: ResendDomain[] }>("domains", { key });
  } catch {
    throw new Error("Resend didn't accept that key. Make a new one with Full access and paste it again.");
  }
  let found = list.data?.find((d) => d.name === domain);
  if (!found) found = await resend<ResendDomain>("domains", { key, body: { name: domain } });
  const full = await resend<ResendDomain>(`domains/${found.id}`, { key }).catch(() => found);

  const pb = await adminPb();
  const data = { owner: userId, key_sealed: seal(key), key_hint: `re_…${key.slice(-4)}`, domain, domain_id: full.id, status: full.status, records: full.records ?? [], from_local: fromLocal };
  const existing = await row(userId);
  const saved = existing ? await pb.collection("mail_accounts").update<Row>(existing.id, data) : await pb.collection("mail_accounts").create<Row>(data);
  return view(saved);
}

/** Asks Resend to check the DNS records again and stores what it says. */
export async function checkMailAccount(userId: string): Promise<MailAccount> {
  const r = await row(userId);
  if (!r) return { connected: false };
  const key = unseal(r.key_sealed);
  if (!key) throw new Error("Connect your Resend account again.");
  await resend(`domains/${r.domain_id}/verify`, { key, body: {} }).catch(() => undefined);
  const d = await resend<ResendDomain>(`domains/${r.domain_id}`, { key });
  const pb = await adminPb();
  return view(await pb.collection("mail_accounts").update<Row>(r.id, { status: d.status, records: d.records ?? r.records }));
}

export async function disconnectMailAccount(userId: string): Promise<void> {
  const r = await row(userId);
  if (r) await (await adminPb()).collection("mail_accounts").delete(r.id);
}
