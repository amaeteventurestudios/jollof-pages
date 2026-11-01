import { NextResponse } from "next/server";
import { CREDIT_PACKS, QUALITY, creditsFor, packReach } from "@/lib/cover-ai";
import { bearer } from "@/lib/server/load-book";
import { adminConfigured, balance, caller, isFree } from "@/lib/server/credits";
import { falConfigured } from "@/lib/server/fal";
import { stripeConfigured } from "@/lib/server/stripe";
import { setupFor } from "@/lib/server/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: the writer's credit balance, prices, and whether keys are set (test mode otherwise). */
export async function GET(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const ready = adminConfigured();
  let credits = 0;
  let setupError = "";
  if (ready) {
    try {
      credits = await balance(me.id);
    } catch (e) {
      setupError = e instanceof Error ? e.message : String(e);
    }
  }
  // a writer with an OpenRouter key can make pictures on it instead of buying credits
  const openrouter = ready ? Boolean((await setupFor(me).catch(() => null))?.keys.openrouter) : false;
  return NextResponse.json({
    credits,
    openrouter,
    free: isFree(me.email),
    testImages: !falConfigured(),
    testPayments: !stripeConfigured(),
    ready: ready && !setupError,
    setupError: ready ? setupError : "The server is missing its PocketBase superuser login (PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD).",
    costs: { draft: creditsFor("draft"), print: creditsFor("print") },
    quality: QUALITY,
    packs: CREDIT_PACKS.map((p) => ({ ...p, ...packReach(p) })),
  });
}
