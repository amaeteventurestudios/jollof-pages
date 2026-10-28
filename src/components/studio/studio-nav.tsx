"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BookOpen, ExternalLink, Feather, Flame, LogOut, Mail, Settings2 } from "lucide-react";
import { pb } from "@/lib/pb";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallButton } from "@/components/pwa";
import { forgetMySite, useMySite } from "./use-my-site";

const LINKS = [
  { href: "/studio", label: "Books", icon: BookOpen, exact: true },
  { href: "/studio/authors", label: "Pen names", icon: Feather },
  { href: "/studio/progress", label: "Progress", icon: Flame },
  { href: "/studio/site", label: "Website", icon: Settings2 },
  { href: "/studio/readers", label: "Readers", icon: Mail },
  { href: "/studio/stats", label: "Analytics", icon: BarChart3 },
];

export function StudioNav() {
  const path = usePathname();
  const router = useRouter();
  const { url } = useMySite();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link href="/studio" className="flex items-baseline gap-2 font-semibold tracking-tight text-ink">
          <span className="text-[17px]">Jollof Pages</span>
          <span className="text-[13px] font-normal text-soft">Studio</span>
        </Link>
        <nav className="ml-2 flex items-center gap-1 overflow-x-auto" aria-label="Studio">
          {LINKS.map((l) => {
            const active = l.exact ? path === l.href : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn("inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-sm whitespace-nowrap text-ink-2 hover:bg-muted [&_svg]:size-4", active && "bg-primary-soft text-primary")}
              >
                <l.icon aria-hidden />
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <InstallButton className="h-8 rounded px-2.5 text-sm text-ink-2 hover:bg-muted" />
          <ThemeToggle className="h-8 rounded px-2.5 text-ink-2 hover:bg-muted [&_svg]:size-4" />
          <Link href={url} target="_blank" className="inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-sm text-ink-2 hover:bg-muted [&_svg]:size-4">
            <ExternalLink aria-hidden />
            <span className="hidden md:inline">View site</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              pb().authStore.clear();
              forgetMySite();
              router.replace("/login");
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-sm text-ink-2 hover:bg-muted [&_svg]:size-4"
          >
            <LogOut aria-hidden />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
