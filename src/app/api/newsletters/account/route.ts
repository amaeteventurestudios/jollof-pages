import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { caller } from "@/lib/server/credits";
import { checkMailAccount, connectMailAccount, disconnectMailAccount, mailAccount } from "@/lib/server/mail-account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (e: unknown, status = 400) => NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status });

/** GET: the author's own Resend account (never the key). */
export async function GET(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    return NextResponse.json(await mailAccount(me.id));
  } catch (e) {
    return fail(e, 502);
  }
}

/** POST { key, domain, fromLocal? } connects; POST { check: true } asks Resend to look at the DNS again. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { key?: string; domain?: string; fromLocal?: string; check?: boolean };
  try {
    if (body.check) return NextResponse.json(await checkMailAccount(me.id));
    return NextResponse.json(await connectMailAccount(me.id, { key: String(body.key ?? ""), domain: String(body.domain ?? ""), fromLocal: body.fromLocal }));
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  await disconnectMailAccount(me.id).catch(() => undefined);
  return NextResponse.json({ connected: false });
}
