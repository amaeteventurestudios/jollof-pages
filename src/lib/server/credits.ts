import "server-only";
import PocketBase from "pocketbase";
import { PB_URL } from "../pb";
import { serverPb } from "../pb-server";

/**
 * Credits for AI cover art. Writers can only read their ledger; this module writes it as a
 * PocketBase superuser, whose login comes from PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD.
 */

let admin: PocketBase | null = null;

export function adminConfigured(): boolean {
  return Boolean(process.env.PB_SUPERUSER_EMAIL && process.env.PB_SUPERUSER_PASSWORD);
}

export async function adminPb(): Promise<PocketBase> {
  if (!adminConfigured()) throw new Error("PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD are not set on the web server.");
  if (admin?.authStore.isValid) return admin;
  const client = new PocketBase((process.env.POCKETBASE_INTERNAL_URL || PB_URL).replace(/\/$/, ""));
  client.autoCancellation(false);
  await client.collection("_superusers").authWithPassword(process.env.PB_SUPERUSER_EMAIL!, process.env.PB_SUPERUSER_PASSWORD!);
  admin = client;
  return client;
}

export interface Caller {
  id: string;
  email: string;
  token: string;
}

/** The signed-in writer behind a request's bearer token, or null. */
export async function caller(token: string | null): Promise<Caller | null> {
  if (!token) return null;
  try {
    const auth = await serverPb(token).collection("users").authRefresh();
    return { id: auth.record.id, email: String(auth.record.email ?? ""), token: auth.token };
  } catch {
    return null;
  }
}

/** Writers who never pay, such as the publisher's own account (COVER_AI_FREE_EMAILS, comma separated). */
export function isFree(email: string): boolean {
  const list = (process.env.COVER_AI_FREE_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function balance(userId: string): Promise<number> {
  const pb = await adminPb();
  const rows = await pb.collection("credit_ledger").getFullList<{ delta: number }>({ filter: pb.filter("owner = {:u}", { u: userId }), fields: "delta" });
  return rows.reduce((sum, r) => sum + (r.delta || 0), 0);
}

// One spend at a time per writer, so two quick clicks cannot both pass the balance check.
const locks = new Map<string, Promise<unknown>>();
export async function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(userId) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(fn);
  locks.set(userId, next);
  try {
    return await next;
  } finally {
    if (locks.get(userId) === next) locks.delete(userId);
  }
}

export async function addLedger(row: { owner: string; delta: number; reason: "topup" | "generation" | "refund" | "grant"; stripe_session?: string; amount_cents?: number; generation?: string; note?: string }) {
  const pb = await adminPb();
  return pb.collection("credit_ledger").create(row);
}

/** Credits a paid Checkout session once. Returns false when it was already credited. */
export async function creditTopup(s: { sessionId: string; userId: string; credits: number; cents: number }): Promise<boolean> {
  const pb = await adminPb();
  const seen = await pb
    .collection("credit_ledger")
    .getList(1, 1, { filter: pb.filter("stripe_session = {:s}", { s: s.sessionId }) })
    .catch(() => ({ totalItems: 0 }));
  if (seen.totalItems) return false;
  try {
    await addLedger({ owner: s.userId, delta: s.credits, reason: "topup", stripe_session: s.sessionId, amount_cents: s.cents, note: `${s.credits} credits` });
    return true;
  } catch {
    // the unique index on stripe_session caught a webhook and a return visit racing each other
    return false;
  }
}
