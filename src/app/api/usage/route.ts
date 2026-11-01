import { NextResponse } from "next/server";
import { caller } from "@/lib/server/credits";
import { bearer } from "@/lib/server/load-book";
import { countUsage, type UsageKind } from "@/lib/server/stats";
import { LANGUAGES } from "@/lib/translate";

export const runtime = "nodejs";

const EXPORTS = new Set(["epub", "docx", "pdf-paperback", "pdf-hardcover", "typ", "backup"]);

/** POST { kind, key }: the Desk counts one export or finished translation. Only the count is kept. */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { kind?: string; key?: string };
  const kind = b.kind as UsageKind;
  const key = String(b.key ?? "");
  const ok = (kind === "export" && EXPORTS.has(key)) || (kind === "translate" && LANGUAGES.some((l) => l.code === key));
  if (!ok) return NextResponse.json({ error: "Unknown usage." }, { status: 400 });
  countUsage(me.id, kind, key);
  return NextResponse.json({ ok: true });
}
