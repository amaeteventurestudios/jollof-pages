import type { StudioSummary } from "@/lib/studio-admin";

/** Jollof Studio's PocketBase, through its own site (Caddy sends /pb there). */
const base = () => (process.env.STUDIO_PB_URL || "https://studio.jollofpages.com/pb").replace(/\/+$/, "");

let cached: { at: number; data: StudioSummary } | null = null;

/**
 * Studio's people and numbers for the admin, asked with the shared APP_ACCESS_SECRET.
 * Kept for 30 seconds so moving around the admin doesn't ask again each time.
 */
export async function studioSummary(fresh = false): Promise<StudioSummary> {
  if (!fresh && cached && Date.now() - cached.at < 30_000) return cached.data;
  const secret = process.env.APP_ACCESS_SECRET;
  if (!secret) throw new Error("APP_ACCESS_SECRET isn't set on the web server, so Jollof Studio can't be read.");
  const res = await fetch(`${base()}/api/jx/admin/summary`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", signal: AbortSignal.timeout(8000) }).catch((e: Error) => {
    throw new Error(`Couldn't reach Jollof Studio (${e.message}).`);
  });
  if (res.status === 404) throw new Error("Jollof Studio hasn't got the admin update yet. It arrives with its next deploy.");
  if (!res.ok) throw new Error(`Jollof Studio answered ${res.status}.`);
  const data = (await res.json()) as StudioSummary;
  cached = { at: Date.now(), data };
  return data;
}
