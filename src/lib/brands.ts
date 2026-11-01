import { PB_URL } from "./pb";
import { normalizeDomain } from "./sites";

/**
 * Brands (white label): the Desk under another name on another domain. Shared by the proxy,
 * the server and the browser, so nothing here may import server code.
 */
export interface Brand {
  id: string;
  collectionId: string;
  name: string;
  domain: string;
  tagline?: string;
  logo?: string;
  color?: string;
  support_email?: string;
  price_cents?: number;
}

const FIELDS = "id,collectionId,name,domain,tagline,logo,color,support_email,price_cents";
let cache: { at: number; list: Brand[] } | null = null;

/** Every active brand, read from PocketBase at most once a minute. Never throws: no brands on failure. */
export async function activeBrands(): Promise<Brand[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.list;
  const base = (process.env.POCKETBASE_INTERNAL_URL || PB_URL).replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/api/collections/brands/records?perPage=500&fields=${FIELDS}`, { cache: "no-store", signal: AbortSignal.timeout(3000) });
    const list = res.ok ? (((await res.json()) as { items?: Brand[] }).items ?? []) : (cache?.list ?? []);
    cache = { at: Date.now(), list };
  } catch {
    cache = { at: Date.now(), list: cache?.list ?? [] };
  }
  return cache.list;
}

export function forgetBrands() {
  cache = null;
}

/** The brand a host belongs to: its own domain, www., or any of its writers' subdomains. */
export function brandFor(host: string, brands: Brand[]): Brand | null {
  const h = normalizeDomain(host.split(":")[0]);
  if (!h) return null;
  return brands.find((b) => h === b.domain || h.endsWith("." + b.domain)) ?? null;
}

export function brandLogo(b: Pick<Brand, "id" | "collectionId" | "logo">): string {
  return b.logo ? `${PB_URL}/api/files/${b.collectionId}/${b.id}/${encodeURIComponent(b.logo)}` : "";
}

/** The brand colour and a darker version of it for hover states. */
export function brandShades(hex: string): { base: string; hover: string } | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const mix = (t: number, to: number) => [r, g, b].map((c) => Math.round(c + (to - c) * t));
  const hexOf = (c: number[]) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
  return { base: hex.toLowerCase(), hover: hexOf(mix(0.2, 0)) };
}
