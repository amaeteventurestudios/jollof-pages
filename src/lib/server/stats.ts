import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { adminPb, adminConfigured } from "./credits";

/**
 * Site analytics without cookies or personal data: daily counts per page, referring site,
 * store click, sign-up and sale. A visitor is counted once a day from a hash of their address,
 * browser and a salt that changes with the server's process, and nothing of it is stored.
 */
export type StatKind = "view" | "visitor" | "ref" | "signup" | "buy_click" | "sale" | "revenue";

const SALT = randomBytes(16).toString("hex");
const pending = new Map<string, number>();
const seen = new Map<string, Set<string>>();
let timer: ReturnType<typeof setTimeout> | null = null;

export function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function count(owner: string, kind: StatKind, key = "", by = 1, date = today()): void {
  if (!owner || !adminConfigured()) return;
  const k = JSON.stringify([owner, date, kind, key.slice(0, 300)]);
  pending.set(k, (pending.get(k) ?? 0) + by);
  timer ??= setTimeout(() => void flush(), 10000);
}

/** True the first time today this visitor is seen on this site. */
export function firstVisitToday(owner: string, ip: string, ua: string): boolean {
  const day = today();
  for (const d of seen.keys()) if (d !== day) seen.delete(d);
  const set = seen.get(day) ?? new Set<string>();
  seen.set(day, set);
  const h = createHash("sha256").update(`${SALT}|${day}|${owner}|${ip}|${ua}`).digest("hex").slice(0, 24);
  if (set.has(h)) return false;
  set.add(h);
  return true;
}

export async function flush(): Promise<void> {
  timer = null;
  const batch = [...pending.entries()];
  pending.clear();
  if (!batch.length) return;
  const pb = await adminPb().catch(() => null);
  if (!pb) return;
  for (const [k, n] of batch) {
    const [owner, date, kind, key] = JSON.parse(k) as string[];
    const filter = pb.filter("owner = {:o} && date = {:d} && kind = {:k} && key = {:key}", { o: owner, d: date, k: kind, key });
    try {
      const row = await pb.collection("site_stats").getFirstListItem<{ id: string; count: number }>(filter);
      await pb.collection("site_stats").update(row.id, { "count+": n });
    } catch {
      await pb
        .collection("site_stats")
        .create({ owner, date, kind, key, count: n })
        .catch(async () => {
          // created by a parallel flush in the meantime
          const row = await pb.collection("site_stats").getFirstListItem<{ id: string }>(filter).catch(() => null);
          if (row) await pb.collection("site_stats").update(row.id, { "count+": n }).catch(() => undefined);
        });
    }
  }
}
