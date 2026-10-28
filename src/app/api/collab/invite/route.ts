import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { adminConfigured, adminPb, caller } from "@/lib/server/credits";
import { INVITE_ROLES, sendInviteEmail, type Invite, type InviteRole } from "@/lib/server/collab";
import { bearer } from "@/lib/server/load-book";
import { publicOrigin } from "@/lib/server/origin";
import type { Author, Book } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?token=: what an invitation is for, so the invite page can say who asked and for what. */
export async function GET(req: Request) {
  if (!adminConfigured()) return NextResponse.json({ error: "Invitations are not set up on this server yet." }, { status: 503 });
  const token = new URL(req.url).searchParams.get("token") || "";
  if (!/^[a-f0-9]{32}$/.test(token)) return NextResponse.json({ error: "This invitation link is not valid." }, { status: 404 });
  const pb = await adminPb();
  const inv = await pb
    .collection("collab_invites")
    .getFirstListItem<Invite & { expand?: { book?: Book & { expand?: { author?: Author } } } }>(pb.filter("token = {:t}", { t: token }), { expand: "book,book.author" })
    .catch(() => null);
  if (!inv || inv.status === "revoked") return NextResponse.json({ error: "This invitation was withdrawn or does not exist." }, { status: 404 });
  const book = inv.expand?.book;
  const hasAccount = await pb
    .collection("users")
    .getFirstListItem(pb.filter("email = {:e}", { e: inv.email }))
    .then(() => true)
    .catch(() => false);
  return NextResponse.json({
    email: inv.email,
    name: inv.name,
    role: inv.role,
    status: inv.status,
    bookId: inv.book,
    bookTitle: book?.title ?? "a book",
    from: book?.expand?.author?.name || "An author",
    message: inv.message,
    hasAccount,
  });
}

/** POST { bookId, email, role, name?, message? }: the book's owner invites someone. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "Invitations are not set up on this server yet." }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { bookId?: string; email?: string; role?: string; name?: string; message?: string };
  const email = String(b.email ?? "")
    .trim()
    .toLowerCase();
  const role = INVITE_ROLES.includes(b.role as InviteRole) ? (b.role as InviteRole) : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!role) return NextResponse.json({ error: "Choose co-writer, editor or commenter." }, { status: 400 });
  if (email === me.email.toLowerCase()) return NextResponse.json({ error: "That is your own address." }, { status: 400 });
  const pb = await adminPb();
  const book = await pb
    .collection("books")
    .getOne<Book>(String(b.bookId ?? ""), { expand: "author" })
    .catch(() => null);
  if (!book || book.owner !== me.id) return NextResponse.json({ error: "Only the book's owner can invite people." }, { status: 403 });
  const existing = await pb
    .collection("collab_invites")
    .getFirstListItem<Invite>(pb.filter("book = {:b} && email = {:e} && status != 'revoked'", { b: book.id, e: email }))
    .catch(() => null);
  if (existing) return NextResponse.json({ error: `${email} is already invited to this book. Change their role from the list instead.` }, { status: 409 });
  const pending = await pb
    .collection("collab_invites")
    .getList(1, 1, { filter: pb.filter("owner = {:o} && created >= {:d}", { o: me.id, d: new Date(Date.now() - 86400000).toISOString().replace("T", " ") }) });
  if (pending.totalItems >= 50) return NextResponse.json({ error: "That is fifty invitations today. Try again tomorrow." }, { status: 429 });
  const inv = await pb.collection("collab_invites").create<Invite>({
    book: book.id,
    owner: me.id,
    email,
    name: String(b.name ?? "")
      .trim()
      .slice(0, 120),
    role,
    status: "pending",
    token: randomBytes(16).toString("hex"),
    message: String(b.message ?? "")
      .trim()
      .slice(0, 1000),
  });
  const link = `${publicOrigin(req)}/invite/${inv.token}`;
  const emailed = await sendInviteEmail({ to: email, from: book.expand?.author?.name || "An author", bookTitle: book.title, role, link, message: inv.message });
  return NextResponse.json({ ok: true, emailed, link, invite: { ...inv, token: undefined } });
}
