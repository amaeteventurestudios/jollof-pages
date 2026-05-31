"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { label: "Product", anchor: "#product" },
  { label: "Workflow", anchor: "#workflow" },
  { label: "Continuity", anchor: "#continuity" },
  { label: "Agents", anchor: "#agents" },
];

export function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-jollof-border/60 bg-[#0a0800]/90 backdrop-blur-md">
      {/* Main bar */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-jollof-orange flex items-center justify-center shadow-md shadow-orange-500/30">
            <span className="text-black font-black text-sm">JP</span>
          </div>
          <span className="text-base font-bold text-jollof-text hidden sm:block">Jollof Pages</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-7">
          {NAV_ITEMS.map(({ label, anchor }) => (
            <a
              key={label}
              href={anchor}
              className="text-sm text-jollof-subtext hover:text-jollof-text transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/login"
            className="text-sm text-jollof-subtext hover:text-jollof-text transition-colors hidden sm:block"
          >
            Admin Login
          </Link>
          <a
            href="#early-access"
            className="inline-flex items-center gap-1.5 bg-jollof-orange text-black font-bold text-sm px-4 py-2 rounded-lg hover:bg-orange-400 active:scale-[0.97] transition-all shadow-md shadow-orange-500/20"
          >
            <span className="hidden xs:inline">Get Early Access</span>
            <span className="xs:hidden">Join</span>
            <ArrowRight size={14} />
          </a>
          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-jollof-border text-jollof-label hover:text-jollof-text hover:bg-jollof-panel transition-colors"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-jollof-border/40 bg-[#0a0800]/95 backdrop-blur-md px-5 py-3 flex flex-col">
          {NAV_ITEMS.map(({ label, anchor }) => (
            <a
              key={label}
              href={anchor}
              onClick={() => setOpen(false)}
              className="text-sm text-jollof-subtext hover:text-jollof-text py-3 border-b border-jollof-border/30 last:border-0 transition-colors"
            >
              {label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="text-sm text-jollof-subtext hover:text-jollof-text py-3 mt-1 transition-colors"
          >
            Admin Login
          </Link>
        </div>
      )}
    </nav>
  );
}
