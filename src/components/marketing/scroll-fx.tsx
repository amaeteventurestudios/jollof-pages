"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Drives every scroll-linked move on the page from one listener, the same way on a phone as on a
 * desktop (CSS scroll timelines are not everywhere yet). Each [data-p] element gets a --p between
 * 0 and 1 for how far it has travelled:
 *   through  from the moment its top enters the bottom of the window to the moment it leaves the top
 *   enter    from entering the bottom of the window until its top reaches a fifth of the way down
 *   pin      across a tall section whose inner box is sticky (horizontal tracks, stacked panels)
 *   exit     from resting at the top of the window until it has scrolled out of it
 * [data-steps] containers mark which of their [data-step] children is nearest the middle of the
 * window with data-active, which the sticky screenshot uses to crossfade.
 */
export function ScrollFx() {
  const path = usePathname();
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-p]"));
    const groups = Array.from(document.querySelectorAll<HTMLElement>("[data-steps]"));
    const tracks = Array.from(document.querySelectorAll<HTMLElement>("[data-track]"));
    let frame = 0;

    const measure = () => {
      // how far a horizontal track has to travel to show its last panel
      for (const t of tracks) {
        const max = Math.max(0, t.scrollWidth - t.clientWidth);
        t.closest<HTMLElement>("[data-p]")?.style.setProperty("--travel", `${max}px`);
      }
    };

    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of els) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        let p = 0;
        switch (el.dataset.p) {
          case "enter":
            p = (vh - r.top) / (vh * 0.8);
            break;
          case "pin":
            p = -r.top / Math.max(1, r.height - vh);
            break;
          case "exit":
            p = -r.top / Math.max(1, r.height);
            break;
          default:
            p = (vh - r.top) / (vh + r.height);
        }
        el.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(4));
      }
      for (const g of groups) {
        const steps = Array.from(g.querySelectorAll<HTMLElement>("[data-step]"));
        let best = 0;
        let dist = Infinity;
        steps.forEach((s, i) => {
          const r = s.getBoundingClientRect();
          const d = Math.abs(r.top + r.height / 2 - vh * 0.55);
          if (d < dist) {
            dist = d;
            best = i;
          }
        });
        if (g.dataset.active !== String(best)) {
          g.dataset.active = String(best);
          steps.forEach((s, i) => s.toggleAttribute("data-on", i === best));
        }
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };
    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // images arriving late change the track widths
    const late = setTimeout(onResize, 1200);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
      clearTimeout(late);
    };
  }, [path]);
  return null;
}
