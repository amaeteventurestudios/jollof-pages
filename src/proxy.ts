import { NextResponse, type NextRequest } from "next/server";
import { rootDomain, siteKeyOf } from "@/lib/sites";

/**
 * Author sites live on subdomains: ada.jollofpages.com/books/x is served by /sites/ada/books/x.
 * An author's own domain works the same way: adaokafor.com/books/x → /sites/adaokafor.com/books/x.
 * The studio and sign-in stay on the root domain, where the login is stored.
 */
export function proxy(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const sub = siteKeyOf(host);
  const { pathname, search } = req.nextUrl;

  if (!sub) {
    // on the root domain, /sites/ada is only reachable at ada.jollofpages.com (or the author's own domain)
    const m = pathname.match(/^\/sites\/([^/]+)(\/.*)?$/);
    // the studio's design preview loads /sites/ada?preview=… in a frame on the root domain
    if (m && process.env.NODE_ENV === "production" && !req.nextUrl.searchParams.has("preview")) {
      const key = decodeURIComponent(m[1]).toLowerCase();
      return NextResponse.redirect(`https://${key.includes(".") ? key : `${key}.${rootDomain()}`}${m[2] ?? "/"}${search}`);
    }
    return NextResponse.next();
  }

  if (/^\/(studio|login|signup)(\/|$)/.test(pathname)) {
    const root = host.split(":")[0].endsWith(".localhost") ? `http://localhost${host.includes(":") ? ":" + host.split(":")[1] : ""}` : `https://${rootDomain()}`;
    return NextResponse.redirect(`${root}${pathname}${search}`);
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
