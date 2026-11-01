import "server-only";
import { adminPb } from "./credits";
import { serverPb } from "../pb-server";
import { subdomainProblem } from "../sites";

/**
 * Studio accounts. Browsers cannot create users or change `access`; this module does both as a
 * PocketBase superuser. STUDIO_SIGNUP picks how new authors get in:
 *   paid    sign up, then pay once through Stripe (the default when STRIPE_SECRET_KEY is set)
 *   free    sign up and start writing, no payment (for a beta or a launch offer)
 *   closed  no sign-up; accounts are made by hand (the default without Stripe)
 */
export type SignupMode = "paid" | "free" | "closed";

export function signupMode(): SignupMode {
  const m = (process.env.STUDIO_SIGNUP || "").toLowerCase();
  if (m === "paid" || m === "free" || m === "closed") return m;
  return process.env.STRIPE_SECRET_KEY ? "paid" : "closed";
}

/** "" when the address is free to take, otherwise why it is not. */
export async function subdomainAvailability(name: string, exceptOwner?: string): Promise<string> {
  const problem = subdomainProblem(name);
  if (problem) return problem;
  // site addresses are public, so this needs no superuser
  const pb = serverPb();
  const hit = await pb
    .collection("site_settings")
    .getList(1, 1, { filter: pb.filter("subdomain = {:s}" + (exceptOwner ? " && owner != {:o}" : ""), { s: name, o: exceptOwner ?? "" }) })
    .catch(() => ({ totalItems: 0 }));
  return hit.totalItems ? "Someone already has that address. Try another." : "";
}

/** Marks an account paid after Stripe confirms the studio payment. Safe to call twice. */
export async function markStudioPaid(userId: string, cents: number): Promise<void> {
  const pb = await adminPb();
  const u = await pb.collection("users").getOne(userId);
  if (u.access === "paid" || u.access === "comp") return;
  await pb.collection("users").update(userId, { access: "paid", paid_cents: cents, paid_at: new Date().toISOString().replace("T", " ") });
}

// a small brake on scripted sign-ups: 5 an hour from one address
const recent = new Map<string, number[]>();
export function allowSignup(ip: string, now = Date.now()): boolean {
  const hour = now - 3600_000;
  const hits = (recent.get(ip) ?? []).filter((t) => t > hour);
  if (hits.length >= 5) return false;
  hits.push(now);
  recent.set(ip, hits);
  return true;
}
