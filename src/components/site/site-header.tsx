"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pattern } from "./patterns";
import { ThemeToggle } from "@/components/theme-toggle";

const STUDIO_LINKS = [
  { href: "/#write", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/login", label: "Sign in" },
];

// an author's own site: their books, their letter and their reader list, nothing about the Desk
const AUTHOR_LINKS = [
  { href: "/#books", label: "Books" },
  { href: "/#about", label: "About" },
];

/**
 * Fixed masthead. Over the red hero it is clear with cream type; once the page scrolls it turns
 * to frosted cream, tucks away while reading down and comes back on the way up.
 */
export function SiteHeader({ name, overHero = false, author = false }: { name: string; overHero?: boolean; author?: boolean }) {
  const LINKS = author ? AUTHOR_LINKS : STUDIO_LINKS;
  const cta = author ? { href: "/#join", label: "Join the reader list" } : { href: "/signup", label: "Buy for $129" };
  const [solid, setSolid] = useState(!overHero);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setSolid(!overHero || y > 60);
      setHidden(y > 400 && y > last + 4);
      if (y < last - 4) setHidden(false);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overHero]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header
        className="masthead fixed inset-x-0 top-0 z-50 text-cream"
        data-solid={solid && !open}
        data-hidden={hidden && !open}
        style={{ color: solid && !open ? undefined : "var(--cream)" }}
      >
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-6 px-4 sm:px-8">
          <Link href="/" className="wide text-[1.25rem] font-bold whitespace-nowrap tracking-[-0.03em]">
            {name}
          </Link>
          <nav aria-label="Site" className="hidden items-center gap-7 lg:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="link font-medium">
                {l.label}
              </Link>
            ))}
            <ThemeToggle className="link size-11 justify-center" />
            <Link href={cta.href} className="btn btn-ink !min-h-11 !px-5 text-[0.95rem]">
              {cta.label}
            </Link>
          </nav>
          <ThemeToggle className="relative z-[60] ml-auto size-11 justify-center lg:hidden" />
          <button
            type="button"
            className="relative z-[60] flex size-11 items-center justify-center lg:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="relative block h-3 w-6" aria-hidden>
              <span className="absolute inset-x-0 top-0 h-[2px] bg-current transition-transform duration-500" style={{ transform: open ? "translateY(5px) rotate(45deg)" : undefined }} />
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-current transition-transform duration-500" style={{ transform: open ? "translateY(-5px) rotate(-45deg)" : undefined }} />
            </span>
          </button>
        </div>
      </header>

      <div id="site-menu" className="menu-sheet fixed inset-0 z-40 flex flex-col justify-end bg-jollof p-6 pb-10 text-cream lg:hidden" data-open={open} aria-hidden={!open}>
        <Pattern id="p-menu" kind="adire" color="var(--char)" opacity={0.28} />
        <nav aria-label="Menu" className="relative grid gap-2">
          {[...LINKS, cta].map((l, i) => (
            <Link key={l.href} href={l.href} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} className="wide text-[2.75rem] leading-[1.05] font-bold tracking-[-0.04em]" style={{ ["--i" as string]: i }}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
