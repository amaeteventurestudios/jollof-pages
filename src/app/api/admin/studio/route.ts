import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/admin";
import { studioSummary } from "@/lib/server/studio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: Jollof Studio's people, totals and latest designs, for Admin > Jollof Studio. ?fresh=1 skips the 30-second cache. */
export async function GET(req: Request) {
  const me = await requireAdmin(req, "studio");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  try {
    return NextResponse.json({ studio: await studioSummary(new URL(req.url).searchParams.has("fresh")) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
