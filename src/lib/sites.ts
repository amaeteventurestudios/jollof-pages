/**
 * Author sites. Every account has a public site at <subdomain>.<root domain>, such as
 * ada.jollofpages.com; the publisher's own site (marked `home`) is the root domain itself.
 * Shared by the proxy, the server and the Desk, so nothing here may import server code.
 */

/** The root domain, from ROOT_DOMAIN, else SITE_URL's host, else jollofpages.com. */
export function rootDomain(): string {
  const raw = process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || hostOf(process.env.SITE_URL) || "jollofpages.com";
  return raw.toLowerCase().replace(/^www\./, "");
}

function hostOf(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

/** Names that are ours, are already in DNS, or would confuse readers. */
export const RESERVED = new Set(
  (
    "www pb api app apps admin administrator root studio desk login signin signup sign-in sign-up register account accounts billing pay " +
    "checkout payments mail email smtp imap pop ftp ns ns1 ns2 dns cdn static assets files media img images dev staging test demo " +
    "beta status help support docs blog news shop store books book authors author readers jollof jollofpages jollof-pages authornx " +
    "authornx-db db database dashboard settings about terms privacy legal security abuse postmaster hostmaster webmaster official"
  ).split(" "),
);

export const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/** A reason the name cannot be used, or "" when it can (taken names are checked separately). */
export function subdomainProblem(name: string): string {
  if (!name) return "Choose a web address.";
  if (name.length < 3) return "Use at least 3 letters or numbers.";
  if (name.length > 40) return "Keep it to 40 characters or fewer.";
  if (!SUBDOMAIN_RE.test(name)) return "Use lowercase letters, numbers and single dashes, starting and ending with a letter or number.";
  if (name.includes("--")) return "Use single dashes only.";
  if (RESERVED.has(name)) return "That address is reserved. Try another.";
  return "";
}

/** Turns a name into a likely web address: "Ada B. Okafor" → "ada-b-okafor". */
export function suggestSubdomain(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

/**
 * The author subdomain a request's host names, or null for the root domain, www, other
 * services' names and unrelated hosts. `ada.localhost` works in development.
 */
export function subdomainOf(host: string, root = rootDomain()): string | null {
  const h = host.toLowerCase().split(":")[0].replace(/\.$/, "");
  let sub = "";
  if (h.endsWith("." + root)) sub = h.slice(0, -(root.length + 1));
  else if (h.endsWith(".localhost")) sub = h.slice(0, -".localhost".length);
  if (!sub || sub.includes(".") || sub === "www" || RESERVED.has(sub) || !SUBDOMAIN_RE.test(sub)) return null;
  return sub;
}

export const DOMAIN_RE = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** "https://WWW.MyBook.com/" → "mybook.com": how a custom domain is stored and looked up. */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/:\d+$/, "")
    .replace(/\.$/, "")
    .replace(/^www\./, "");
}

/** A reason a custom domain cannot be used, or "". */
export function domainProblem(domain: string, root = rootDomain()): string {
  if (!DOMAIN_RE.test(domain)) return "Enter a domain such as yourname.com.";
  if (domain === root || domain.endsWith("." + root)) return `Your ${root} address is already yours; enter a domain you bought elsewhere.`;
  return "";
}

/**
 * The site key a request's host names: an author subdomain ("ada"), an author's own domain
 * ("adaokafor.com", always with a dot), or null for the root domain and anything local.
 */
export function siteKeyOf(host: string, root = rootDomain()): string | null {
  const sub = subdomainOf(host, root);
  if (sub) return sub;
  const h = normalizeDomain(host);
  if (h === root || h.endsWith("." + root) || h === "localhost" || h.endsWith(".localhost") || /^[\d.]+$/.test(h) || h.includes(":")) return null;
  return DOMAIN_RE.test(h) ? h : null;
}

/** The Desk (the writing app) and its sign-in live on this subdomain of the root domain. */
export const DESK_SUBDOMAIN = "desk";

/** The pages that belong to the Desk: the app itself and the account pages in front of it. */
export const DESK_PATHS = /^\/(desk|studio|login|signup|join|invite)(\/|$)/;

/** The public address of a site, for links from the Desk (which runs on desk.<root domain>). */
export function siteUrl(site: { subdomain?: string; home?: boolean; custom_domain?: string } | null | undefined, here?: { protocol: string; host: string }): string {
  if (site && !site.home && site.custom_domain) return `https://${site.custom_domain}`;
  const loc = here ?? (typeof window !== "undefined" ? window.location : { protocol: "https:", host: rootDomain() });
  const host = loc.host.replace(new RegExp(`^(www|${DESK_SUBDOMAIN})\\.`), "");
  if (!site || site.home || !site.subdomain) return `${loc.protocol}//${host}`;
  return `${loc.protocol}//${site.subdomain}.${host}`;
}

/** The address without the scheme, for showing to people. */
export function siteLabel(site: { subdomain?: string; home?: boolean; custom_domain?: string } | null | undefined): string {
  return siteUrl(site).replace(/^https?:\/\//, "");
}

/** Author Site Pro: a connected domain and the extras that come later. */
export function hasPro(site: { home?: boolean; pro_until?: string } | null | undefined, now = Date.now()): boolean {
  if (!site) return false;
  if (site.home) return true;
  const until = site.pro_until ? Date.parse(site.pro_until.replace(" ", "T")) : NaN;
  return Number.isFinite(until) && until > now;
}
