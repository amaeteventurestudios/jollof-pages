import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/server/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One-click unsubscribe (RFC 8058): mail apps POST here from the List-Unsubscribe header. */
export async function POST(req: Request) {
  const t = new URL(req.url).searchParams.get("t") || "";
  return NextResponse.json({ ok: Boolean(await unsubscribe(t)) });
}
