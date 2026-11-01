import { NextResponse } from "next/server";
import { adminPb } from "@/lib/server/credits";
import { requireAdmin } from "@/lib/server/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface AuditRow {
  id: string;
  actor: string;
  role: string;
  action: string;
  target: string;
  target_label: string;
  detail: string;
  created: string;
}

/** GET ?page=1: the audit log, newest first, 100 a page. Owner only. */
export async function GET(req: Request) {
  const me = await requireAdmin(req, "audit");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page")) || 1);
  const pb = await adminPb();
  const list = await pb
    .collection("admin_audit")
    .getList<AuditRow>(page, 100, { sort: "-created" })
    .catch(() => ({ items: [] as AuditRow[], totalPages: 0, totalItems: 0 }));
  return NextResponse.json({ rows: list.items, pages: list.totalPages, total: list.totalItems });
}
