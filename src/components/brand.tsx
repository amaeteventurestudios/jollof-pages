"use client";

import { useEffect, useSyncExternalStore } from "react";
import { brandShades } from "@/lib/brands";

/** What the browser knows about the brand it is on. null: Jollof Pages itself. */
export interface PublicBrand {
  id: string;
  name: string;
  domain: string;
  tagline: string;
  logo: string;
  color: string;
  support: string;
}

const KEY = "jp-brand";
let state: PublicBrand | null | undefined;
let asked = false;
const listeners = new Set<() => void>();

function read(): PublicBrand | null {
  if (state !== undefined) return state;
  try {
    const raw = sessionStorage.getItem(KEY);
    state = raw ? (JSON.parse(raw) as PublicBrand | null) : null;
  } catch {
    state = null;
  }
  return state;
}

function ask() {
  if (asked) return;
  asked = true;
  fetch("/api/brand")
    .then((r) => r.json())
    .then((j: { brand: PublicBrand | null }) => {
      state = j.brand;
      sessionStorage.setItem(KEY, JSON.stringify(j.brand));
      listeners.forEach((l) => l());
    })
    .catch(() => undefined);
}

/** The brand this page is on, or null for Jollof Pages. Starts from the last answer this session. */
export function useBrand(): PublicBrand | null {
  const b = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      ask();
      return () => listeners.delete(l);
    },
    read,
    () => null,
  );
  return b;
}

/** The product's name here: the brand's, or "Jollof Pages". */
export function BrandName({ fallback = "Jollof Pages" }: { fallback?: string }) {
  return <>{useBrand()?.name || fallback}</>;
}

/** The domain writers' sites live on here: the brand's, or "jollofpages.com". */
export function BrandDomain() {
  return <>{useBrand()?.domain || "jollofpages.com"}</>;
}

/** Puts the brand's colour on buttons and links, and its name in the tab title. Renders nothing. */
export function BrandStyle() {
  const b = useBrand();
  useEffect(() => {
    const root = document.documentElement;
    const shades = b ? brandShades(b.color) : null;
    if (shades) {
      root.style.setProperty("--primary", shades.base);
      root.style.setProperty("--primary-hover", shades.hover);
      // pale in light mode and deep in dark mode, from whatever the card colour is
      root.style.setProperty("--primary-soft", `color-mix(in srgb, ${shades.base} 14%, var(--card))`);
    } else ["--primary", "--primary-hover", "--primary-soft"].forEach((v) => root.style.removeProperty(v));
    if (b) document.title = document.title.replace(/Jollof Pages/g, b.name);
  }, [b]);
  return null;
}
