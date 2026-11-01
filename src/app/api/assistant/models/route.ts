import { NextResponse } from "next/server";
import { caller } from "@/lib/server/credits";
import { listModels, resolve } from "@/lib/server/assistant";
import { bearer } from "@/lib/server/load-book";
import { PROVIDER_IDS, type Provider } from "@/lib/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?provider=: the models the writer's key for that provider can use. */
export async function GET(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const p = new URL(req.url).searchParams.get("provider") as Provider;
  if (!PROVIDER_IDS.includes(p)) return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  const r = await resolve(me, p);
  if (typeof r === "string") return NextResponse.json({ error: r }, { status: 400 });
  try {
    return NextResponse.json({ models: await listModels(r) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
