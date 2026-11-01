import { NextResponse } from "next/server";
import { freeDomainsOpen } from "@/lib/server/flags";
import { bearer } from "@/lib/server/load-book";
import { caller } from "@/lib/server/credits";
import { checkAvailability } from "@/lib/server/namecom";
import { asDomain, freeMaxCents, freeTlds } from "@/lib/server/domain-rules";
import { DOMAIN_RE } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET ?name=adaokafor → { domain, free, reason } for the free first-year domain search. */
export async function GET(req: Request) {
  const me = await caller(bearer(req));
  if (!me)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!(await freeDomainsOpen()))
    return NextResponse.json(
      { error: "Free domains are coming soon." },
      { status: 503 },
    );
  const domain = asDomain(new URL(req.url).searchParams.get("name") || "");
  if (!DOMAIN_RE.test(domain))
    return NextResponse.json({
      domain,
      free: false,
      reason: "Type the name you want, such as adaokafor.",
    });
  const tld = domain.split(".").slice(1).join(".");
  if (!freeTlds().includes(tld))
    return NextResponse.json({
      domain,
      free: false,
      reason: `The free domain can end in ${freeTlds()
        .map((t) => "." + t)
        .join(" or ")}.`,
    });
  try {
    const a = await checkAvailability(domain);
    const cents = Math.round((a.purchasePrice ?? 0) * 100);
    if (!a.purchasable)
      return NextResponse.json({
        domain,
        free: false,
        reason: `${domain} is taken. Try a variation, such as adding "books" or "author".`,
      });
    if (a.premium || cents > freeMaxCents())
      return NextResponse.json({
        domain,
        free: false,
        reason: `${domain} is a premium name and is not included. Try another.`,
      });
    return NextResponse.json({ domain, free: true, reason: "" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
