import { NextResponse } from "next/server";
import { adminConfigured, adminPb, caller } from "@/lib/server/credits";
import { allowSignup } from "@/lib/server/accounts";
import { setRole, type Invite } from "@/lib/server/collab";
import { bearer } from "@/lib/server/load-book";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { token, name?, password? }: accept an invitation. Signed in, the invitation joins that
 * account. Signed out, a free collaborator account is made for the invited address (the reply then
 * tells the page to sign in with the new password); an address that already has an account must
 * sign in first.
 */
export async function POST(req: Request) {
  if (!adminConfigured()) return NextResponse.json({ error: "Invitations are not set up on this server yet." }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { token?: string; name?: string; password?: string };
  const token = String(b.token ?? "");
  if (!/^[a-f0-9]{32}$/.test(token)) return NextResponse.json({ error: "This invitation link is not valid." }, { status: 404 });
  const pb = await adminPb();
  const inv = await pb
    .collection("collab_invites")
    .getFirstListItem<Invite>(pb.filter("token = {:t}", { t: token }))
    .catch(() => null);
  if (!inv || inv.status === "revoked") return NextResponse.json({ error: "This invitation was withdrawn or does not exist." }, { status: 404 });

  let userId: string;
  let joinedAs = inv.name;
  const me = await caller(bearer(req));
  if (me) {
    if (me.id === inv.owner) return NextResponse.json({ error: "This is your own book." }, { status: 400 });
    if (inv.status === "accepted" && inv.user && inv.user !== me.id) return NextResponse.json({ error: "Someone else already accepted this invitation." }, { status: 409 });
    userId = me.id;
    // an account that never paid can still work on books shared with it
    const rec = await pb.collection("users").getOne<{ access: string; name: string }>(me.id, { fields: "access,name" });
    joinedAs = rec.name || joinedAs;
    if (rec.access === "pending") await pb.collection("users").update(me.id, { access: "collaborator" });
  } else {
    if (inv.status === "accepted") return NextResponse.json({ error: "This invitation was already accepted. Sign in to open the book.", needLogin: true }, { status: 409 });
    const exists = await pb
      .collection("users")
      .getFirstListItem(pb.filter("email = {:e}", { e: inv.email }))
      .catch(() => null);
    if (exists) return NextResponse.json({ error: `There is already an account for ${inv.email}. Sign in to accept.`, needLogin: true }, { status: 409 });
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
    if (!allowSignup(ip)) return NextResponse.json({ error: "Too many new accounts from here. Try again in an hour." }, { status: 429 });
    const name = String(b.name ?? inv.name ?? "")
      .trim()
      .slice(0, 120);
    const password = String(b.password ?? "");
    if (!name) return NextResponse.json({ error: "Enter your name, as the author will see it.", field: "name" }, { status: 400 });
    if (password.length < 10) return NextResponse.json({ error: "Use a password of at least 10 characters.", field: "password" }, { status: 400 });
    // the invitation reached this address, so it counts as verified
    const user = await pb.collection("users").create({ email: inv.email, password, passwordConfirm: password, name, emailVisibility: false, verified: true, access: "collaborator" });
    userId = user.id;
    joinedAs = name;
  }

  await setRole(pb, inv.book, userId, inv.role);
  await pb.collection("collab_invites").update(inv.id, { status: "accepted", user: userId, name: joinedAs });
  return NextResponse.json({ ok: true, bookId: inv.book, email: inv.email, signIn: !me });
}
