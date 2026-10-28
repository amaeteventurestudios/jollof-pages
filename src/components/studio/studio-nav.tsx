"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BookOpen, ExternalLink, Feather, Flame, Images, LifeBuoy, LogOut, Mail, Settings2, Users } from "lucide-react";
import { pb } from "@/lib/pb";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallButton } from "@/components/pwa";
import { forgetMySite, useMySite } from "./use-my-site";
import { isCollaboratorOnly } from "./auth-gate";

const LINKS = [
  { href: "/studio", label: "Books", icon: BookOpen, exact: true, collaborator: true },
  { href: "/studio/authors", label: "Pen names", icon: Feather },
  { href: "/studio/progress", label: "Progress", icon: Flame },
  { href: "/studio/images", label: "My images", icon: Images },
  { href: "/studio/collaboration", label: "Collaboration", icon: Users, collaborator: true },
  { href: "/studio/site", label: "Website", icon: Settings2 },
  { href: "/studio/readers", label: "Readers", icon: Mail },
  { href: "/studio/stats", label: "Analytics", icon: BarChart3 },
];

export function StudioNav() {
  const path = usePathname();
  const router = useRouter();
  const { url } = useMySite();
  const guest = isCollaboratorOnly();
  const links = guest ? LINKS.filter((l) => "collaborator" in l) : LINKS;
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link href="/studio" className="flex shrink-0 items-baseline gap-2 font-semibold tracking-tight whitespace-nowrap text-ink">
          <span className="text-[17px]">Jollof Pages</span>
          <span className="hidden text-[13px] font-normal text-soft 2xl:inline">Studio</span>
        </Link>
        <nav className="ml-2 flex items-center gap-1 overflow-x-auto" aria-label="Studio">
          {links.map((l) => {
            const active = l.exact ? path === l.href : path.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                title={l.label}
                aria-current={active ? "page" : undefined}
                className={cn("inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-sm whitespace-nowrap text-ink-2 hover:bg-muted [&_svg]:size-4", active && "bg-primary-soft text-primary")}
              >
                <l.icon aria-hidden />
                <span className="hidden lg:inline">{l.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/studio/help"
            title="Help"
            aria-current={path.startsWith("/studio/help") ? "page" : undefined}
            className={cn("inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-sm text-ink-2 hover:bg-muted [&_svg]:size-4", path.startsWith("/studio/help") && "bg-primary-soft text-primary")}
          >
            <LifeBuoy aria-hidden />
            <span className="hidden 2xl:inline">Help</span>
          </Link>
          <InstallButton className="h-8 rounded px-2.5 text-sm text-ink-2 hover:bg-muted" />
          <ThemeToggle className="h-8 rounded px-2.5 text-ink-2 hover:bg-muted [&_svg]:size-4" />
          {!guest && (
            <Link href={url} target="_blank" title="View site" className="inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-sm text-ink-2 hover:bg-muted [&_svg]:size-4">
              <ExternalLink aria-hidden />
              <span className="hidden 2xl:inline">View site</span>
            </Link>
          )}
          <button
            type="button"
            title="Sign out"
            onClick={() => {
              pb().authStore.clear();
              forgetMySite();
              router.replace("/login");
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-sm text-ink-2 hover:bg-muted [&_svg]:size-4"
          >
            <LogOut aria-hidden />
            <span className="hidden 2xl:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
