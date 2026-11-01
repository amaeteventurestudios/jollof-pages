import { resolve4 } from "node:dns/promises";
import { NextResponse } from "next/server";
import { adminPb } from "@/lib/server/credits";
import { audit, listPrice, loadAdminData, requireAdmin } from "@/lib/server/admin";
import { studioCents } from "@/lib/admin";
import { brandLogo, forgetBrands } from "@/lib/brands";
import { DOMAIN_RE, normalizeDomain, rootDomain } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BrandRow {
  id: string;
  collectionId: string;
  name: string;
  domain: string;
  tagline?: string;
  logo?: string;
  color?: string;
  support_email?: string;
  price_cents?: number;
  active?: boolean;
  created: string;
}

async function list() {
  const pb = await adminPb();
  const [rows, data] = await Promise.all([pb.collection("brands").getFullList<BrandRow>({ sort: "created" }), loadAdminData()]);
  const stats = (id: string) => {
    const users = data.users.filter((u) => (u.brand ?? "") === id);
    return { writers: users.length, paid: users.filter((u) => u.access === "paid").length, earnedCents: users.reduce((s, u) => s + studioCents(u, listPrice()), 0) };
  };
  return {
    root: rootDomain(),
    serverIp: process.env.SERVER_IP || (await resolve4(rootDomain()).catch(() => [] as string[]))[0] || "",
    home: stats(""),
    brands: rows.map((b) => ({ ...b, logoUrl: brandLogo(b), ...stats(b.id) })),
  };
}

/** GET: every brand with its writers and earnings, and the same for Jollof Pages itself. */
export async function GET(req: Request) {
  const me = await requireAdmin(req, "brands");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  return NextResponse.json(await list());
}

/**
 * POST multipart form: id (empty for a new brand), name, domain, tagline, color, support_email,
 * price (dollars), active ("true"), logo (file). Or JSON { action: "delete", id }.
 */
export async function POST(req: Request) {
  const me = await requireAdmin(req, "brands.manage");
  if (!("id" in me)) return NextResponse.json({ error: me.error }, { status: me.status });
  const pb = await adminPb();
  try {
    if (!(req.headers.get("content-type") || "").includes("multipart/form-data")) {
      const b = (await req.json().catch(() => ({}))) as { action?: string; id?: string };
      if (b.action !== "delete") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
      const row = await pb.collection("brands").getOne<BrandRow>(String(b.id ?? ""));
      const users = await pb.collection("users").getList(1, 1, { filter: pb.filter("brand = {:b}", { b: row.id }) });
      if (users.totalItems) return NextResponse.json({ error: `${users.totalItems} writers signed up on ${row.name}. Switch it off instead of deleting it.` }, { status: 400 });
      await pb.collection("brands").delete(row.id);
      await audit(me, "brand.delete", { id: row.id, label: row.name });
    } else {
      const f = await req.formData();
      const text = (k: string, max: number) =>
        String(f.get(k) ?? "")
          .trim()
          .slice(0, max);
      const id = text("id", 40);
      const name = text("name", 80);
      const domain = normalizeDomain(text("domain", 253));
      const color = text("color", 7);
      const support = text("support_email", 200);
      const price = Math.round(Number(text("price", 12) || 0) * 100);
      if (!name) return NextResponse.json({ error: "Give the brand a name." }, { status: 400 });
      if (!DOMAIN_RE.test(domain)) return NextResponse.json({ error: "Enter the brand's domain, such as writewithada.com." }, { status: 400 });
      if (domain === rootDomain() || domain.endsWith("." + rootDomain())) return NextResponse.json({ error: `Use a domain of the brand's own, not ${rootDomain()}.` }, { status: 400 });
      if (color && !/^#[0-9a-f]{6}$/i.test(color)) return NextResponse.json({ error: "Pick a colour like #1d4f91." }, { status: 400 });
      if (support && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(support)) return NextResponse.json({ error: "The support email doesn't look right." }, { status: 400 });
      if (!Number.isFinite(price) || price < 0 || price > 1_000_000) return NextResponse.json({ error: "Enter a price in dollars, or leave it empty for the Jollof Pages price." }, { status: 400 });
      const clash = await pb
        .collection("brands")
        .getFirstListItem<BrandRow>(pb.filter("domain = {:d} && id != {:id}", { d: domain, id }))
        .catch(() => null);
      if (clash) return NextResponse.json({ error: `${clash.name} already uses ${domain}.` }, { status: 400 });
      const body = new FormData();
      body.set("name", name);
      body.set("domain", domain);
      body.set("tagline", text("tagline", 160));
      body.set("color", color);
      body.set("support_email", support);
      body.set("price_cents", String(price));
      body.set("active", f.get("active") === "true" ? "true" : "false");
      const logo = f.get("logo");
      if (logo instanceof File && logo.size) {
        if (logo.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Keep the logo under 2 MB." }, { status: 400 });
        body.set("logo", logo);
      }
      if (!id) body.set("created_by", me.email);
      const row = id ? await pb.collection("brands").update<BrandRow>(id, body) : await pb.collection("brands").create<BrandRow>(body);
      await audit(me, "brand.save", { id: row.id, label: row.name }, `${domain}${row.active ? "" : " (off)"}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: /unique|domain/i.test(msg) ? "Another brand already uses that domain." : msg }, { status: 400 });
  }
  forgetBrands();
  return NextResponse.json(await list());
}
