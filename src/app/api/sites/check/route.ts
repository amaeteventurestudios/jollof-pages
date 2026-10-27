import { NextResponse } from "next/server";
import { subdomainAvailability } from "@/lib/server/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?name=ada → { ok, problem } for the sign-up form's live address check. */
export async function GET(req: Request) {
  const name = (new URL(req.url).searchParams.get("name") || "").trim().toLowerCase();
  const problem = await subdomainAvailability(name);
  return NextResponse.json({ ok: !problem, problem });
}
