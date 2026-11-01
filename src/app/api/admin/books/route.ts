import { NextResponse } from "next/server";
import { loadAdminData, loadInsightData, requireAdmin } from "@/lib/server/admin";
import { bookRows, sinceDate } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: every book on the platform by title, status and size. Never its text. */
export async function GET(req: Request) {
  const me = await requireAdmin(req, "books");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const [data, x] = await Promise.all([loadAdminData(), loadInsightData(sinceDate(7))]);
  return NextResponse.json({ books: bookRows(data, x) });
}
