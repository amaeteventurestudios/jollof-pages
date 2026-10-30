"use client";

import { useEffect, useState } from "react";
import { getSiteSettings } from "@/lib/studio";
import { siteUrl } from "@/lib/sites";
import type { SiteSettings } from "@/lib/types";

let cached: Promise<SiteSettings | null> | null = null;

/** The signed-in author's own site and its public address (the root domain for the publisher). */
export function useMySite(): { site: SiteSettings | null; url: string } {
  const [site, setSite] = useState<SiteSettings | null>(null);
  const [url, setUrl] = useState("/");
  useEffect(() => {
    cached ??= getSiteSettings().catch(() => null);
    cached.then((s) => {
      setSite(s);
      setUrl(siteUrl(s));
    });
  }, []);
  return { site, url };
}

/** Call after changing the site's address so other screens pick it up. */
export function forgetMySite() {
  cached = null;
}
