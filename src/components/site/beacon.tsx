"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function send(data: Record<string, string>) {
  const body = JSON.stringify(data);
  if (!navigator.sendBeacon?.("/api/a", new Blob([body], { type: "application/json" }))) fetch("/api/a", { method: "POST", body, keepalive: true }).catch(() => undefined);
}

/** Counts page views and store clicks for the site owner's analytics. No cookies, nothing about the reader. */
export function Beacon() {
  const path = usePathname();
  useEffect(() => {
    // studio previews and internal /sites/ addresses are not visits
    if (location.search.includes("preview=") || location.pathname.startsWith("/sites/") || window.self !== window.top) return;
    send({ kind: "view", path: location.pathname, ref: document.referrer });
  }, [path]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-track]");
      if (el) send({ kind: "buy_click", store: el.getAttribute("data-track") || "Store" });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
