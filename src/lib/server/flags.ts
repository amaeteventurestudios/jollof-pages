import "server-only";
import { serverPb } from "@/lib/pb-server";
import { adminPb } from "./credits";
import { FLAGS, type FlagKey, type Flags } from "@/lib/flags";

let cache: { at: number; flags: Flags } | null = null;

/** Every switch, read fresh at most every 30 seconds. A switch that can't be read counts as off. */
export async function getFlags(): Promise<Flags> {
  if (cache && Date.now() - cache.at < 30_000) return cache.flags;
  const flags = Object.fromEntries(Object.keys(FLAGS).map((k) => [k, false])) as Flags;
  try {
    const rows = await serverPb().collection("app_flags").getFullList<{ key: string; on: boolean }>();
    for (const r of rows) if (r.key in flags) flags[r.key as FlagKey] = r.on;
  } catch {
    // before the migration, everything stays off
  }
  cache = { at: Date.now(), flags };
  return flags;
}

export async function flagOn(key: FlagKey): Promise<boolean> {
  return (await getFlags())[key];
}

export async function setFlag(key: FlagKey, on: boolean, by: string): Promise<Flags> {
  const pb = await adminPb();
  const row = await pb
    .collection("app_flags")
    .getFirstListItem<{ id: string }>(pb.filter("key = {:k}", { k: key }))
    .catch(() => null);
  if (row) await pb.collection("app_flags").update(row.id, { on, updated_by: by });
  else await pb.collection("app_flags").create({ key, on, updated_by: by });
  cache = null;
  return getFlags();
}

/** The free .com is offered only when Name.com is connected and the owner has switched it on. */
export async function freeDomainsOpen(): Promise<boolean> {
  const { namecomConfigured } = await import("./namecom");
  return namecomConfigured() && (await flagOn("free_domains"));
}
