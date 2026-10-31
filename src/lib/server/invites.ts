import "server-only";
import type PocketBase from "pocketbase";
import { addLedger, adminPb } from "./credits";
import { inviteProblem, isInviteCode, type TesterInvite } from "../invites";

/** The invite behind a code, or null. Never throws. */
export async function findInvite(code: string): Promise<TesterInvite | null> {
  if (!isInviteCode(code)) return null;
  try {
    const pb = await adminPb();
    return await pb.collection("tester_invites").getFirstListItem<TesterInvite>(pb.filter("code = {:c}", { c: code }));
  } catch {
    return null;
  }
}

/** The invite if it still lets someone in, otherwise the sentence to show them. */
export async function usableInvite(code: string): Promise<{ invite: TesterInvite } | { problem: string }> {
  const invite = await findInvite(code);
  const problem = inviteProblem(invite);
  return problem || !invite ? { problem } : { invite };
}

/**
 * Opens the studio for a tester: full free access, a note of which link brought them in, the
 * link's starting AI credits, and one more use counted on the link. Paid accounts keep "paid".
 */
export async function admitTester(pb: PocketBase, invite: TesterInvite, userId: string, current?: string): Promise<void> {
  await pb.collection("users").update(userId, { tester_invite: invite.id, ...(current === "paid" ? {} : { access: "comp" }) });
  await pb
    .collection("tester_invites")
    .update(invite.id, { "uses+": 1 })
    .catch(() => undefined);
  if (invite.credits) await addLedger({ owner: userId, delta: invite.credits, reason: "grant", note: `Tester invite: ${invite.label || invite.code}` }).catch(() => undefined);
}
