import { NextResponse } from "next/server";
import { adminConfigured, caller } from "@/lib/server/credits";
import { forget, listMemories } from "@/lib/server/assistant";
import { bearer } from "@/lib/server/load-book";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: everything the assistant remembers about the writer. */
export async function GET(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ memories: [] });
  try {
    return NextResponse.json({ memories: await listMemories(me) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

/** DELETE ?id= (one memory) or ?id=all. */
export async function DELETE(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Which memory?" }, { status: 400 });
  await forget(me, id);
  return NextResponse.json({ ok: true });
}
