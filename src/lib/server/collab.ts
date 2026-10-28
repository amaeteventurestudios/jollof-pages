import "server-only";
import type PocketBase from "pocketbase";
import { letterHtml, letterText, mailConfigured, sendMail } from "./mail";
import { ROLE_INFO, type CollabRole } from "../collab";
import type { Book } from "../types";

export type InviteRole = Exclude<CollabRole, "owner">;
export const INVITE_ROLES: InviteRole[] = ["cowriter", "editor", "commenter"];
const FIELD: Record<InviteRole, "cowriters" | "editors" | "commenters"> = { cowriter: "cowriters", editor: "editors", commenter: "commenters" };

export interface Invite {
  id: string;
  book: string;
  owner: string;
  email: string;
  name: string;
  role: InviteRole;
  status: "pending" | "accepted" | "revoked";
  token: string;
  user: string;
  message: string;
  created: string;
}

export type SharedBook = Book & { cowriters: string[]; editors: string[]; commenters: string[] };

/** Gives a user exactly one role on a book (or none), keeping the three lists in step. */
export async function setRole(pb: PocketBase, bookId: string, userId: string, role: InviteRole | null): Promise<void> {
  const book = await pb.collection("books").getOne<SharedBook>(bookId);
  const patch: Record<string, string[]> = {};
  for (const r of INVITE_ROLES) {
    const list = (book[FIELD[r]] ?? []).filter((id) => id !== userId);
    if (r === role) list.push(userId);
    patch[FIELD[r]] = list;
  }
  // everyone with any role, which is what the access rules check
  patch.members = [...new Set(INVITE_ROLES.flatMap((r) => patch[FIELD[r]]))];
  await pb.collection("books").update(bookId, patch);
}

export async function sendInviteEmail(o: { to: string; from: string; bookTitle: string; role: InviteRole; link: string; message: string }): Promise<boolean> {
  if (!mailConfigured()) return false;
  const role = ROLE_INFO[o.role];
  const body = `**${o.from}** has invited you to work on **${o.bookTitle}** as their ${role.label.toLowerCase()}.\n\n${role.text}${o.message ? `\n\n"${o.message}"` : ""}\n\nOpen the invitation: ${o.link}\n\nIt is free; if you have no Jollof Pages account yet, you can make one from the link.`;
  try {
    await sendMail({
      to: o.to,
      subject: `${o.from} invited you to ${o.bookTitle}`,
      html: letterHtml(body, { name: "Jollof Pages", footer: "You are getting this because an author invited you to their book." }),
      text: letterText(body),
      fromName: `${o.from} via Jollof Pages`,
      fromLocal: "invites",
    });
    return true;
  } catch {
    return false;
  }
}
