"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { APP_CLASS, APP_QUERY } from "@/lib/app-mode";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Turns on app mode for the signed-in studio and the account pages. The public website never
 * renders this, so it keeps its own phone layout.
 */
export function AppMode() {
  useIsoLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add(APP_CLASS);
    return () => html.classList.remove(APP_CLASS);
  }, []);
  // the browser bar and status bar take the app bar's colour while in app mode
  useEffect(() => {
    const mq = window.matchMedia(APP_QUERY);
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const before = meta?.content;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    const tag = meta;
    const paint = () => {
      const bar = getComputedStyle(document.documentElement).getPropertyValue("--app-bar").trim();
      if (mq.matches && bar) tag.content = bar;
      else if (before) tag.content = before;
    };
    paint();
    const mo = new MutationObserver(paint);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    mq.addEventListener("change", paint);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", paint);
      if (before) tag.content = before;
    };
  }, []);
  return null;
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia(APP_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** Whether the screen is a phone or tablet, where the Desk runs as an app. */
export function useAppMode(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(APP_QUERY).matches,
    () => false,
  );
}
