"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, BookOpen, ChevronDown, Download, ExternalLink, Feather, Flame, GraduationCap, Images, LifeBuoy, Lightbulb, LogOut, Mail, Monitor, Moon, Settings2, ShieldCheck, Sparkles, Sun, Users } from "lucide-react";
import { pb } from "@/lib/pb";
import { cn } from "@/lib/utils";
import { ThemeToggle, useThemeChoice, type ThemeChoice } from "@/components/theme-toggle";
import { useInstallPrompt } from "@/components/pwa";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { forgetMySite, useMySite } from "./use-my-site";
import { isCollaboratorOnly } from "./auth-gate";

const LINKS = [
  { href: "/studio", label: "Books", icon: BookOpen, exact: true, collaborator: true },
  { href: "/studio/authors", label: "Pen names", icon: Feather },
  { href: "/studio/progress", label: "Progress", icon: Flame },
  { href: "/studio/images", label: "My images", short: "Images", icon: Images },
  { href: "/studio/collaboration", label: "Collaboration", short: "Collab", icon: Users, collaborator: true },
  { href: "/studio/site", label: "Website", icon: Settings2 },
  { href: "/studio/readers", label: "Readers", icon: Mail },
  { href: "/studio/stats", label: "Analytics", short: "Stats", icon: BarChart3 },
];

const THEMES: { id: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "Match my device", icon: Monitor },
];

/**
 * The studio's menu. Every section is always in view: one row on wide screens, and below that a
 * second row of evenly spaced tabs, so nothing ever has to be scrolled sideways.
 */
export function StudioNav() {
  const path = usePathname();
  const guest = isCollaboratorOnly();
  const links = guest ? LINKS.filter((l) => "collaborator" in l) : LINKS;
  const isActive = (l: (typeof LINKS)[number]) => (l.exact ? path === l.href : path.startsWith(l.href));
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link href="/studio" className="flex shrink-0 items-baseline gap-2 font-semibold tracking-tight whitespace-nowrap text-ink">
          <span className="text-[17px]">Jollof Pages</span>
          <span className="text-[13px] font-normal text-soft">Studio</span>
        </Link>
        <nav className="ml-2 hidden min-w-0 items-center gap-0.5 xl:flex" aria-label="Studio">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l) ? "page" : undefined}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-sm whitespace-nowrap text-ink-2 hover:bg-muted [&_svg]:size-4", isActive(l) && "bg-primary-soft text-primary")}
            >
              <l.icon aria-hidden />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle className="size-9 justify-center rounded text-ink-2 hover:bg-muted [&_svg]:size-[18px]" />
          <AccountMenu guest={guest} />
        </div>
      </div>
      <nav className={cn("grid border-t border-border xl:hidden", links.length > 4 ? "grid-cols-4 sm:grid-cols-8" : "grid-cols-2")} aria-label="Studio sections">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActive(l) ? "page" : undefined}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[11.5px] text-ink-2 hover:bg-muted [&_svg]:size-[18px]",
              isActive(l) && "text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-primary",
            )}
          >
            <l.icon aria-hidden />
            <span className="max-w-full truncate">{l.short ?? l.label}</span>
          </Link>
        ))}
      </nav>
    </header>
  );
}

// whether the signed-in account may open the admin, asked once per page load
let adminCheck: Promise<boolean> | null = null;
function useIsAdmin(skip: boolean): boolean {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (skip) return;
    adminCheck ??= fetch("/api/admin?check=1", { headers: { Authorization: `Bearer ${pb().authStore.token}` } })
      .then((r) => r.json())
      .then((j: { admin?: boolean }) => !!j.admin)
      .catch(() => false);
    let live = true;
    void adminCheck.then((a) => live && setAdmin(a));
    return () => {
      live = false;
    };
  }, [skip]);
  return admin;
}

/** Who is signed in, with appearance, help, the assistant, the site and sign out in one place. */
export function AccountMenu({ guest = isCollaboratorOnly() }: { guest?: boolean }) {
  const router = useRouter();
  const { url } = useMySite();
  const install = useInstallPrompt();
  const [theme, setTheme] = useThemeChoice();
  const admin = useIsAdmin(guest);
  const me = pb().authStore.record;
  const email = String(me?.email ?? "");
  const name = String(me?.name ?? "").trim() || email.split("@")[0] || "Account";
  const initial = name.charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 items-center gap-2 rounded pr-1.5 pl-1 text-sm text-ink-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40">
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground">
          {initial}
        </span>
        <span className="hidden max-w-36 truncate md:inline">{name}</span>
        <ChevronDown className="size-3.5 text-soft" aria-hidden />
        <span className="sr-only">Account menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-2">
          <p className="truncate text-sm font-medium text-ink">{name}</p>
          {email && <p className="truncate text-[12.5px] text-soft">{email}</p>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeChoice)}>
          {THEMES.map((t) => (
            <DropdownMenuRadioItem key={t.id} value={t.id} onSelect={(e) => e.preventDefault()}>
              <t.icon aria-hidden className="text-soft" />
              {t.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        {admin && (
          <DropdownMenuItem onSelect={() => router.push("/studio/admin")}>
            <ShieldCheck aria-hidden /> Admin
          </DropdownMenuItem>
        )}
        {!guest && (
          <DropdownMenuItem onSelect={() => router.push("/studio/assistant")}>
            <Sparkles aria-hidden /> AI assistant
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => router.push("/studio/help")}>
          <LifeBuoy aria-hidden /> Help and support
        </DropdownMenuItem>
        {!guest && (
          <DropdownMenuItem onSelect={() => router.push("/studio/ideas")}>
            <Lightbulb aria-hidden /> Request a feature
          </DropdownMenuItem>
        )}
        {!guest && (
          <DropdownMenuItem onSelect={() => router.push("/studio/learn")}>
            <GraduationCap aria-hidden /> Learn
          </DropdownMenuItem>
        )}
        {!guest && (
          <DropdownMenuItem onSelect={() => window.open(url, "_blank", "noopener")}>
            <ExternalLink aria-hidden /> View my site
          </DropdownMenuItem>
        )}
        {install && (
          <DropdownMenuItem onSelect={() => void install()}>
            <Download aria-hidden /> Install the app
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            adminCheck = null;
            pb().authStore.clear();
            forgetMySite();
            router.replace("/login");
          }}
        >
          <LogOut aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
