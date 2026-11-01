import { NextResponse, type NextRequest } from "next/server";
import { DESK_PATHS, DESK_SUBDOMAIN, rootDomain, siteKeyOf } from "@/lib/sites";
import { activeBrands, brandFor } from "@/lib/brands";

/**
 * Author sites live on subdomains: ada.jollofpages.com/books/x is served by /sites/ada/books/x.
 * An author's own domain works the same way: adaokafor.com/books/x → /sites/adaokafor.com/books/x.
 * The Desk (the writing app) and its sign-in live on desk.jollofpages.com, where the login is
 * stored; the old /studio addresses forward to /desk.
 * A brand (white label) works the same on its own domain: brand.com/desk is its Desk, and its
 * writers' sites are ada.brand.com.
 */
export async function proxy(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const brand = brandFor(host, await activeBrands());
  const root = brand?.domain ?? rootDomain();
  const sub = siteKeyOf(host, root);
  const { pathname, search } = req.nextUrl;
  const hostname = host.split(":")[0].toLowerCase();
  const port = host.includes(":") ? ":" + host.split(":")[1] : "";
  const local = hostname === "localhost" || hostname.endsWith(".localhost");
  // brands keep their Desk on their own domain; Jollof Pages runs it on its own subdomain
  const deskOrigin = brand ? null : local ? `http://${DESK_SUBDOMAIN}.localhost${port}` : `https://${DESK_SUBDOMAIN}.${root}`;
  const onDesk = !brand && (hostname === `${DESK_SUBDOMAIN}.${root}` || hostname === `${DESK_SUBDOMAIN}.localhost`);
  const deskPath = pathname.replace(/^\/studio(?=\/|$)/, "/desk");

  // a brand's own domain has no Jollof Pages home page: it opens straight into its Desk
  if (brand && !sub && pathname === "/") return NextResponse.redirect(new URL("/desk", req.url));

  if (onDesk) {
    if (pathname === "/") {
      const url = req.nextUrl.clone();
      url.pathname = "/desk";
      return NextResponse.rewrite(url);
    }
    if (deskPath !== pathname) return NextResponse.redirect(`${deskOrigin}${deskPath}${search}`, 308);
    return NextResponse.next();
  }

  if (!sub) {
    // the Desk moved to its own subdomain: old bookmarks and the sign-in pages follow it there
    // (plain localhost keeps everything on one origin for development)
    if (DESK_PATHS.test(pathname) && deskOrigin && hostname !== "localhost" && !/^[\d.]+$/.test(hostname)) {
      return NextResponse.redirect(`${deskOrigin}${deskPath}${search}`, 308);
    }
    if (deskPath !== pathname) return NextResponse.redirect(new URL(`${deskPath}${search}`, req.url), 308);
    // on the root domain, /sites/ada is only reachable at ada.jollofpages.com (or the author's own domain)
    const m = pathname.match(/^\/sites\/([^/]+)(\/.*)?$/);
    // the Desk's design preview loads /sites/ada?preview=… in a frame
    if (m && process.env.NODE_ENV === "production" && !req.nextUrl.searchParams.has("preview")) {
      const key = decodeURIComponent(m[1]).toLowerCase();
      return NextResponse.redirect(`https://${key.includes(".") ? key : `${key}.${root}`}${m[2] ?? "/"}${search}`);
    }
    return NextResponse.next();
  }

  if (DESK_PATHS.test(pathname)) {
    const home = deskOrigin ?? `https://${root}`;
    return NextResponse.redirect(`${home}${deskPath}${search}`);
  }
  if (pathname === "/" || pathname === "/books" || pathname.startsWith("/books/")) {
    const url = req.nextUrl.clone();
    url.pathname = `/sites/${sub}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  // pages only: not the API, Next's own files or anything with a file extension
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
