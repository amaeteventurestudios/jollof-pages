/**
 * Tester invite links: the owner sends jollofpages.com/join/<code> to someone who wants to try the
 * studio, and that person signs up with full access and no payment. The rules live here so they
 * can be tested without a database; src/lib/server/invites.ts reads and writes the rows.
 */

export interface TesterInvite {
  id: string;
  code: string;
  label?: string;
  /** 0 = no limit */
  max_uses?: number;
  uses?: number;
  /** PocketBase date ("2026-11-30 12:00:00.000Z") or "" for never */
  expires?: string;
  revoked?: boolean;
  credits?: number;
  created_by?: string;
  created: string;
}

export type InviteState = "active" | "revoked" | "expired" | "full";

const when = (pbDate: string) => new Date(pbDate.replace(" ", "T")).getTime();

export function inviteState(inv: Pick<TesterInvite, "revoked" | "expires" | "max_uses" | "uses">, now = Date.now()): InviteState {
  if (inv.revoked) return "revoked";
  if (inv.expires && when(inv.expires) <= now) return "expired";
  if (inv.max_uses && (inv.uses ?? 0) >= inv.max_uses) return "full";
  return "active";
}

/** What to tell someone who opens a link that no longer works. */
export function inviteProblem(inv: Pick<TesterInvite, "revoked" | "expires" | "max_uses" | "uses"> | null, now = Date.now()): string {
  if (!inv) return "This invite link is not valid. Check that you copied all of it, or ask for a new one.";
  switch (inviteState(inv, now)) {
    case "revoked":
      return "This invite link has been switched off. Ask the person who sent it for a new one.";
    case "expired":
      return "This invite link has expired. Ask the person who sent it for a new one.";
    case "full":
      return "Every place on this invite link has been taken. Ask the person who sent it for a new one.";
    default:
      return "";
  }
}

/** A code that is hard to guess and safe in a link: 16 characters from a 56-letter alphabet. */
export function newInviteCode(random: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n))): string {
  // no 0/O, 1/l/I, so a code read out loud or retyped still works
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  while (out.length < 16) for (const b of random(32)) if (b < abc.length * 4 && out.length < 16) out += abc[b % abc.length];
  return out;
}

export const isInviteCode = (s: string) => /^[a-zA-Z0-9_-]{8,64}$/.test(s);

/** The expiry date for a link that lasts `days` days, as PocketBase stores dates; "" for never. */
export function expiryFor(days: number, now = Date.now()): string {
  if (!days || days <= 0) return "";
  return new Date(now + days * 86400_000).toISOString().replace("T", " ");
}

export const inviteUrl = (origin: string, code: string) => `${origin.replace(/\/$/, "")}/join/${code}`;
