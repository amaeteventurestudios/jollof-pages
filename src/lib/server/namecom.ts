import "server-only";

/**
 * Name.com API v4, for the free .com that comes with yearly Author Site Pro.
 * NAMECOM_USERNAME and NAMECOM_TOKEN come from name.com/account/settings/api; NAMECOM_API
 * defaults to production (use https://api.dev.name.com with a test token while trying it out).
 * Purchases are paid from the Name.com account's balance or card on file.
 */

export function namecomConfigured(): boolean {
  return Boolean(process.env.NAMECOM_USERNAME && process.env.NAMECOM_TOKEN);
}

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const base = (process.env.NAMECOM_API || "https://api.name.com").replace(/\/$/, "");
  const auth = Buffer.from(`${process.env.NAMECOM_USERNAME}:${process.env.NAMECOM_TOKEN}`).toString("base64");
  const res = await fetch(`${base}/v4/${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(30000),
  });
  const body = (await res.json().catch(() => ({}))) as T & { message?: string; details?: string };
  if (!res.ok) throw new Error(`Name.com: ${body.message ?? res.status}${body.details ? ` (${body.details})` : ""}`);
  return body;
}

export interface Availability {
  domainName: string;
  purchasable?: boolean;
  premium?: boolean;
  purchasePrice?: number; // US dollars, first year
  renewalPrice?: number;
}

export async function checkAvailability(domain: string): Promise<Availability> {
  const out = await call<{ results?: Availability[] }>("domains:checkAvailability", { method: "POST", body: { domainNames: [domain] } });
  return out.results?.[0] ?? { domainName: domain, purchasable: false };
}

/** ICANN registrant details; the author owns the domain, with WHOIS privacy on. */
export interface Registrant {
  firstName: string;
  lastName: string;
  companyName?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string; // two letters
  phone: string; // +1.5555555555
  email: string;
}

export async function registerDomain(domain: string, priceDollars: number, who: Registrant) {
  const contacts = { registrant: who, admin: who, tech: who, billing: who };
  return call<{ domain?: { domainName: string; expireDate?: string }; order?: number; totalPaid?: number }>("domains", {
    method: "POST",
    body: { domain: { domainName: domain, privacyEnabled: true, autorenewEnabled: true, contacts }, purchasePrice: priceDollars, years: 1 },
  });
}

/** Points the domain (and www) at this server. */
export async function pointAt(domain: string, ip: string): Promise<void> {
  await call(`domains/${encodeURIComponent(domain)}/records`, { method: "POST", body: { host: "", type: "A", answer: ip, ttl: 300 } });
  await call(`domains/${encodeURIComponent(domain)}/records`, { method: "POST", body: { host: "www", type: "CNAME", answer: domain, ttl: 300 } }).catch(() => undefined);
}

export async function setAutorenew(domain: string, on: boolean): Promise<void> {
  await call(`domains/${encodeURIComponent(domain)}:${on ? "enableAutorenew" : "disableAutorenew"}`, { method: "POST", body: {} });
}
