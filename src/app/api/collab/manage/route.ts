import { NextResponse } from "next/server";
import { adminConfigured, adminPb, caller } from "@/lib/server/credits";
import { INVITE_ROLES, sendInviteEmail, setRole, type Invite, type InviteRole } from "@/lib/server/collab";
import { bearer } from "@/lib/server/load-book";
import { publicOrigin } from "@/lib/server/origin";
import type { Book } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { inviteId, action, role? }. The book's owner can change a role, resend or copy the link, or
 * remove someone. A collaborator can remove themselves ("leave").
 */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "Invitations are not set up on this server yet." }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { inviteId?: string; action?: string; role?: string };
  const pb = await adminPb();
  const inv = await pb
    .collection("collab_invites")
    .getOne<Invite & { expand?: { book?: Book & { expand?: { author?: { name: string } } } } }>(String(b.inviteId ?? ""), { expand: "book,book.author" })
    .catch(() => null);
  if (!inv) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const owner = inv.owner === me.id;
  const self = inv.user === me.id;
  const link = `${publicOrigin(req)}/invite/${inv.token}`;

  switch (b.action) {
    case "link":
      if (!owner) break;
      return NextResponse.json({ ok: true, link });
    case "resend": {
      if (!owner || inv.status !== "pending") break;
      const emailed = await sendInviteEmail({
        to: inv.email,
        from: inv.expand?.book?.expand?.author?.name || "An author",
        bookTitle: inv.expand?.book?.title || "a book",
        role: inv.role,
        link,
        message: inv.message,
      });
      return NextResponse.json({ ok: true, emailed, link });
    }
    case "role": {
      if (!owner || !INVITE_ROLES.includes(b.role as InviteRole)) break;
      await pb.collection("collab_invites").update(inv.id, { role: b.role });
      if (inv.status === "accepted" && inv.user) await setRole(pb, inv.book, inv.user, b.role as InviteRole);
      return NextResponse.json({ ok: true });
    }
    case "remove":
    case "leave": {
      if (!(owner || (self && b.action === "leave"))) break;
      if (inv.user) await setRole(pb, inv.book, inv.user, null);
      await pb.collection("collab_invites").update(inv.id, { status: "revoked" });
      return NextResponse.json({ ok: true });
    }
  }
  return NextResponse.json({ error: "Not allowed." }, { status: 403 });
}
