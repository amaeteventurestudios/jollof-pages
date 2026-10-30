import "server-only";

/** Which names come free with yearly Pro: FREE_DOMAIN_TLDS (default "com") under FREE_DOMAIN_MAX_CENTS (default $15). */
export function freeTlds(): string[] {
  return (process.env.FREE_DOMAIN_TLDS || "com")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
}

export function freeMaxCents(): number {
  return Number(process.env.FREE_DOMAIN_MAX_CENTS) || 1500;
}

/** "Ada Okafor" or "adaokafor" → "adaokafor.com"; a typed domain is kept. */
export function asDomain(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");
  if (s.includes(".")) return s;
  const base = s.replace(/[^a-z0-9-]+/g, "").replace(/^-+|-+$/g, "");
  return base ? `${base}.${freeTlds()[0]}` : "";
}
