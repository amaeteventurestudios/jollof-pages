import "server-only";
import { headers } from "next/headers";
import { activeBrands, brandFor, type Brand } from "../brands";

const hostOf = (h: Headers) => h.get("x-forwarded-host") || h.get("host") || "";

/** The brand a request came in on, or null for Jollof Pages itself. */
export async function brandOf(req: Request): Promise<Brand | null> {
  return brandFor(hostOf(req.headers), await activeBrands());
}

/** The same, for server components. */
export async function currentBrand(): Promise<Brand | null> {
  return brandFor(hostOf(await headers()), await activeBrands());
}
