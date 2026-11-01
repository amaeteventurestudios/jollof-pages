import { NextResponse } from "next/server";
import { brandOf } from "@/lib/server/brand";
import { brandLogo } from "@/lib/brands";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET: the brand this address belongs to (name, logo, colour), or { brand: null } for Jollof Pages. */
export async function GET(req: Request) {
  const b = await brandOf(req);
  return NextResponse.json({ brand: b ? { id: b.id, name: b.name, domain: b.domain, tagline: b.tagline ?? "", logo: brandLogo(b), color: b.color ?? "", support: b.support_email ?? "" } : null });
}
