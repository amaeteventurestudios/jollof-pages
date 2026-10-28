import { NextResponse } from "next/server";
import { adminConfigured, caller } from "@/lib/server/credits";
import { listModels, saveSetup, setupFor } from "@/lib/server/assistant";
import { bearer } from "@/lib/server/load-book";
import { PROVIDERS, PROVIDER_IDS, type Provider } from "@/lib/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: the writer's assistant setup (never the keys themselves). */
export async function GET(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "The assistant is not set up on this server yet." }, { status: 503 });
  return NextResponse.json(await setupFor(me));
}

/**
 * POST { provider, model?, key?, removeKey?, memory? }. A new key is tried against the provider
 * before it is saved, so a typo is caught straight away.
 */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "The assistant is not set up on this server yet." }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { provider?: string; model?: string; key?: string; removeKey?: boolean; memory?: boolean };
  const provider = PROVIDER_IDS.includes(b.provider as Provider) ? (b.provider as Provider) : null;
  if (!provider) return NextResponse.json({ error: "Choose Claude, ChatGPT or OpenRouter." }, { status: 400 });
  let key: string | null | undefined;
  if (b.removeKey) key = null;
  else if (typeof b.key === "string" && b.key.trim()) {
    key = b.key.trim();
    if (!PROVIDERS[provider].keyPattern.test(key))
      return NextResponse.json({ error: `That does not look like a ${PROVIDERS[provider].company} key. It ${PROVIDERS[provider].keyHint}.` }, { status: 400 });
    try {
      await listModels({ provider, key });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
    }
  }
  const setup = await saveSetup(me, { provider, model: typeof b.model === "string" ? b.model : undefined, key, memory: typeof b.memory === "boolean" ? b.memory : undefined });
  return NextResponse.json(setup);
}
