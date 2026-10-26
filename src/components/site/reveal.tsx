"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Adds .is-in to [data-reveal] elements once as they enter the viewport. */
export function Reveal() {
  const path = usePathname();
  useEffect(() => {
    // once the intro has played, later pages in this visit skip it
    const seen = setTimeout(() => document.documentElement.classList.add("seen"), 2800);
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"));
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    targets.forEach((el) => io.observe(el));
    const safety = setTimeout(() => {
      targets.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.classList.add("is-in");
      });
    }, 2500);
    return () => {
      io.disconnect();
      clearTimeout(safety);
      clearTimeout(seen);
    };
  }, [path]);
  return null;
}
