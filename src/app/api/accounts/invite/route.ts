import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { adminPb, caller } from "@/lib/server/credits";
import { admitTester, findInvite, usableInvite } from "@/lib/server/invites";
import { inviteProblem } from "@/lib/invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?code= says whether a tester link still works, without using it up. */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code") ?? "";
  const problem = inviteProblem(await findInvite(code));
  return NextResponse.json({ ok: !problem, problem });
}

/**
 * POST { invite } with a signed-in account: someone who already had an account (say they signed
 * up and never paid) opens a tester link. Their studio opens free and they count as a tester.
 */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { invite?: string };
  const found = await usableInvite(String(body.invite ?? ""));
  if ("problem" in found) return NextResponse.json({ error: found.problem }, { status: 403 });
  try {
    const pb = await adminPb();
    const user = await pb.collection("users").getOne(me.id);
    if (user.tester_invite) return NextResponse.json({ ok: true });
    if (user.access === "collaborator")
      return NextResponse.json({ error: "This email is set up as a collaborator on someone else's book. Sign up with a different email to test the full Desk." }, { status: 400 });
    await admitTester(pb, found.invite, me.id, String(user.access ?? ""));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
