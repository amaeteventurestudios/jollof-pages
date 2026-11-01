import "server-only";

/** The public address of the site, for links sent to Stripe. Behind Caddy, the request URL is the container's. */
export function publicOrigin(req: Request): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}
