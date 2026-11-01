import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { adminConfigured, adminPb } from "@/lib/server/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** True when the request carries APP_ACCESS_SECRET, the key Jollof Studio and the AI writer share with us. */
function trusted(req: Request): boolean {
  const secret = process.env.APP_ACCESS_SECRET ?? "";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

/**
 * GET ?email=…&app=studio|ai-writer, for the other Jollof apps to ask whether a person may use
 * them, by the switches on Admin > Writers > Access. Someone with no Jollof Pages account keeps
 * Jollof Studio (it has its own free accounts) but not the AI writer. Suspended accounts get neither.
 */
export async function GET(req: Request) {
  if (!trusted(req)) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: "PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD are not set on the web server." }, { status: 503 });
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  const app = url.searchParams.get("app");
  if (!email || (app !== "studio" && app !== "ai-writer")) return NextResponse.json({ error: "Give an email and app=studio or app=ai-writer." }, { status: 400 });
  const pb = await adminPb();
  const user = await pb
    .collection("users")
    .getFirstListItem<{ suspended?: boolean; studio_off?: boolean; ai_writer?: boolean }>(pb.filter("email = {:e}", { e: email }), { fields: "suspended,studio_off,ai_writer" })
    .catch(() => null);
  if (!user) return NextResponse.json({ allowed: app === "studio", account: false });
  if (user.suspended) return NextResponse.json({ allowed: false, account: true, reason: "suspended" });
  const allowed = app === "studio" ? !user.studio_off : Boolean(user.ai_writer);
  return NextResponse.json({ allowed, account: true, ...(allowed ? {} : { reason: "switched off" }) });
}
