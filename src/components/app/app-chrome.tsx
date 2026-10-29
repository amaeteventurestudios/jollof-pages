"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Dialog as DP } from "radix-ui";
import { BookOpen, ChevronRight, Download, X, ExternalLink, GraduationCap, LifeBuoy, Lightbulb, LogOut, Menu, Share, ShieldCheck, Sparkles, SquarePlus } from "lucide-react";
import { pb } from "@/lib/pb";
import { cn } from "@/lib/utils";
import { isStandalone } from "@/lib/app-mode";
import { useThemeChoice, type ThemeChoice } from "@/components/theme-toggle";
import { useInstallPrompt } from "@/components/pwa";
import { signOut, useIsAdmin } from "@/components/studio/studio-nav";
import { LINKS, THEMES } from "@/components/studio/studio-links";
import { useMySite } from "@/components/studio/use-my-site";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type Link_ = (typeof LINKS)[number];

/** The four sections that get their own tab; everything else sits under More. */
const TAB_HREFS = ["/studio", "/studio/progress", "/studio/site", "/studio/stats"];
const GUEST_TAB_HREFS = ["/studio", "/studio/collaboration"];

const HELP: Item[] = [
  { href: "/studio/learn", label: "Learn", icon: GraduationCap },
  { href: "/studio/help", label: "Help and support", icon: LifeBuoy },
  { href: "/studio/ideas", label: "Request a feature", icon: Lightbulb },
];
const ACCOUNT: Item[] = [
  { href: "/studio/assistant", label: "AI assistant", icon: Sparkles },
  { href: "/studio/admin", label: "Admin", icon: ShieldCheck },
];

const TITLES: Record<string, string> = {
  ...Object.fromEntries(LINKS.map((l) => [l.href, l.label])),
  ...Object.fromEntries([...HELP, ...ACCOUNT].map((l) => [l.href, l.label])),
  "/studio": "Your books",
};

function titleFor(path: string): string {
  const hit = Object.keys(TITLES)
    .filter((h) => path === h || path.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? TITLES[hit] : "Jollof Pages";
}

/**
 * The studio as a phone and tablet app: an app bar under the status bar, a tab bar above the home
 * indicator, and a full-screen More page for the rest. Desktop never shows any of it.
 */
export function AppChrome({ guest }: { guest: boolean }) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const links = guest ? LINKS.filter((l) => "collaborator" in l) : LINKS;
  const tabHrefs = guest ? GUEST_TAB_HREFS : TAB_HREFS;
  const tabs = tabHrefs.map((h) => links.find((l) => l.href === h)).filter(Boolean) as Link_[];
  const isActive = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));
  const onTab = tabs.some((t) => isActive(t.href, "exact" in t && t.exact));
  // close the More page whenever a link inside it changes the page
  const [shownPath, setShownPath] = useState(path);
  if (shownPath !== path) {
    setShownPath(path);
    setMore(false);
  }

  return (
    <div className="hidden app:contents">
      <AppBar title={titleFor(path)} onAccount={() => setMore(true)} />
      {path === "/studio" && <InstallCard />}
      <nav aria-label="Studio" className="app-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md supports-[backdrop-filter]:bg-card/85">
        <div className="mx-auto flex h-[var(--app-tab-h)] max-w-2xl">
          {tabs.map((t) => {
            const on = isActive(t.href, "exact" in t && t.exact);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={cn("relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-soft transition-colors active:bg-muted", on && "text-primary")}
              >
                {on && <span aria-hidden className="absolute inset-x-[30%] top-0 h-0.5 bg-primary" />}
                <t.icon className={cn("size-[22px]", on && "stroke-[2.25]")} aria-hidden />
                {"short" in t && t.short ? t.short : t.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMore(true)}
            aria-haspopup="dialog"
            className={cn("relative flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-soft active:bg-muted", !onTab && "text-primary")}
          >
            {!onTab && <span aria-hidden className="absolute inset-x-[30%] top-0 h-0.5 bg-primary" />}
            <Menu className="size-[22px]" aria-hidden />
            More
          </button>
        </div>
      </nav>
      <MorePage open={more} onOpenChange={setMore} guest={guest} links={links.filter((l) => !tabHrefs.includes(l.href))} isActive={isActive} />
    </div>
  );
}

function isIosBrowser(): boolean {
  const ua = navigator.userAgent;
  return (/iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) && !isStandalone();
}

const INSTALL_KEY = "jp-install-card";

/** A one-time nudge, in the browser only, to put the studio on the home screen like a store app. */
function InstallCard() {
  const install = useInstallPrompt();
  // the studio only renders in the browser (behind the sign-in check), so these read the device directly
  const [ios] = useState(isIosBrowser);
  const [hidden, setHidden] = useState(() => {
    try {
      return isStandalone() || localStorage.getItem(INSTALL_KEY) === "done";
    } catch {
      return isStandalone();
    }
  });
  if (hidden || (!install && !ios)) return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(INSTALL_KEY, "done");
    } catch {
      // no storage: the card comes back next visit
    }
  };
  return (
    <div className="flex items-start gap-3 border-b border-border bg-card px-4 py-3">
      <span aria-hidden className="grid size-11 shrink-0 place-items-center bg-primary text-primary-foreground">
        <BookOpen className="size-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-ink">Get the Jollof Pages app</p>
        {install ? (
          <p className="text-[13.5px] text-soft">Install it to open the studio full screen from your home screen.</p>
        ) : (
          <p className="text-[13.5px] text-soft">
            Tap <Share className="inline size-4 align-[-3px] text-primary" aria-label="Share" /> in Safari, then Add to Home Screen.
          </p>
        )}
        {install && (
          <button
            type="button"
            onClick={async () => {
              await install();
              dismiss();
            }}
            className="mt-2 h-9 bg-primary px-4 text-[14px] font-semibold text-primary-foreground active:opacity-80"
          >
            Install
          </button>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="Not now" className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center text-soft active:opacity-70">
        <X className="size-5" />
      </button>
    </div>
  );
}

/** Brand on top until the page's own big title scrolls away, then the section's name, as iOS does. */
function AppBar({ title, onAccount }: { title: string; onAccount: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 56);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className="app-bar sticky top-0 z-30 bg-[var(--app-bar)] pt-[env(safe-area-inset-top)] text-[var(--app-bar-ink)] shadow-[0_1px_0_rgb(0_0_0/0.12)]">
      <div className="relative flex h-14 items-center gap-3 pr-2 pl-[max(1rem,env(safe-area-inset-left))]">
        <span className={cn("flex items-center gap-2.5 transition-all duration-200", scrolled && "pointer-events-none -translate-y-2 opacity-0")}>
          <AppMark />
          <span className="text-[17px] font-semibold tracking-tight">Jollof Pages</span>
        </span>
        <span aria-hidden={!scrolled} className={cn("absolute inset-x-16 truncate text-center text-[17px] font-semibold tracking-tight transition-all duration-200", !scrolled && "translate-y-2 opacity-0")}>
          {title}
        </span>
        <AccountButton onClick={onAccount} />
      </div>
    </header>
  );
}

/** The app icon in miniature: a white book on the tomato square, boxy like the rest of the brand. */
export function AppMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("grid size-8 place-items-center bg-white/15 ring-1 ring-white/30", className)}>
      <BookOpen className="size-[18px]" />
    </span>
  );
}

export function AccountButton({ onClick }: { onClick: () => void }) {
  const me = pb().authStore.record;
  const name = String(me?.name ?? "").trim() || String(me?.email ?? "").split("@")[0] || "Account";
  return (
    <button type="button" onClick={onClick} aria-label="Account and more" className="ml-auto grid size-11 place-items-center active:opacity-70">
      <span className="grid size-8 place-items-center bg-white text-[14px] font-semibold text-[#ad3a17]">{name.charAt(0).toUpperCase()}</span>
    </button>
  );
}

/** Everything that is not a tab, as a full-screen page like a native app's More or Settings tab. */
export function MorePage({
  open,
  onOpenChange,
  guest,
  links = [],
  isActive = () => false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: boolean;
  links?: Link_[];
  isActive?: (href: string) => boolean;
}) {
  const router = useRouter();
  const { url } = useMySite();
  const install = useInstallPrompt();
  const [theme, setTheme] = useThemeChoice();
  const admin = useIsAdmin(guest);
  // Safari on iPhone and iPad has no install prompt; people add the app from the Share menu.
  // The studio only renders in the browser (behind the sign-in check), so this can read it directly.
  const [ios] = useState(isIosBrowser);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const me = pb().authStore.record;
  const email = String(me?.email ?? "");
  const name = String(me?.name ?? "").trim() || email.split("@")[0] || "Account";
  const help = guest ? HELP.filter((h) => h.href !== "/studio/ideas") : HELP;
  const account = ACCOUNT.filter((a) => (a.href === "/studio/admin" ? admin : !guest));

  return (
    <DP.Root open={open} onOpenChange={onOpenChange}>
      <DP.Portal>
        <DP.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col bg-background data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:duration-200 data-[state=open]:duration-300"
        >
          <header className="app-bar shrink-0 bg-[var(--app-bar)] pt-[env(safe-area-inset-top)] text-[var(--app-bar-ink)]">
            <div className="relative flex h-14 items-center justify-center px-2">
              <DP.Title className="text-[17px] font-semibold tracking-tight">More</DP.Title>
              <DP.Close className="absolute right-2 h-11 px-3 text-[17px] font-semibold active:opacity-70">Done</DP.Close>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(2rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-2xl px-4">
              <div className="mt-5 flex items-center gap-4 border border-border bg-card p-4">
                <span aria-hidden className="grid size-14 shrink-0 place-items-center bg-primary text-2xl font-semibold text-primary-foreground">
                  {name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-ink">{name}</p>
                  {email && <p className="truncate text-[15px] text-soft">{email}</p>}
                </div>
              </div>

              {links.length > 0 && (
                <Group title="Studio">
                  {links.map((l) => (
                    <Row key={l.href} href={l.href} icon={l.icon} label={l.label} current={isActive(l.href)} />
                  ))}
                </Group>
              )}

              <Group title="Appearance">
                <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-1 bg-paper-2 p-1">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={theme === t.id}
                      onClick={() => setTheme(t.id as ThemeChoice)}
                      className={cn("flex h-11 items-center justify-center gap-1.5 text-[15px] text-ink-2", theme === t.id && "bg-card font-semibold text-ink shadow-sm")}
                    >
                      <t.icon className="size-4" aria-hidden />
                      {t.id === "system" ? "Auto" : t.label}
                    </button>
                  ))}
                </div>
              </Group>

              <Group title="Help">
                {help.map((h) => (
                  <Row key={h.href} href={h.href} icon={h.icon} label={h.label} current={isActive(h.href)} />
                ))}
              </Group>

              <Group title="Account">
                {account.map((a) => (
                  <Row key={a.href} href={a.href} icon={a.icon} label={a.label} current={isActive(a.href)} />
                ))}
                {!guest && <Row icon={ExternalLink} label="View my site" onClick={() => window.open(url, "_blank", "noopener")} />}
                {install && <Row icon={Download} label="Install the app" onClick={() => void install()} />}
                {!install && ios && <Row icon={Download} label="Add to Home Screen" onClick={() => setShowIosHelp((v) => !v)} expanded={showIosHelp} />}
                {showIosHelp && (
                  <ol className="grid gap-3 bg-card px-4 py-4 text-[15px] text-ink-2">
                    <li className="flex items-center gap-3">
                      <Share className="size-5 shrink-0 text-primary" aria-hidden /> Tap Share in Safari&apos;s toolbar.
                    </li>
                    <li className="flex items-center gap-3">
                      <SquarePlus className="size-5 shrink-0 text-primary" aria-hidden /> Choose Add to Home Screen, then Add.
                    </li>
                    <li className="text-soft">Jollof Pages then opens full screen from its own icon, like any other app.</li>
                  </ol>
                )}
              </Group>

              <div className="mt-8 border border-border bg-card">
                <button
                  type="button"
                  onClick={() => {
                    signOut();
                    onOpenChange(false);
                    router.replace("/login");
                  }}
                  className="flex h-14 w-full items-center justify-center gap-2 text-[17px] font-medium text-destructive active:bg-muted"
                >
                  <LogOut className="size-5" aria-hidden /> Sign out
                </button>
              </div>
            </div>
          </div>
        </DP.Content>
      </DP.Portal>
    </DP.Root>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 px-1 text-[13px] font-semibold tracking-[0.06em] text-soft uppercase">{title}</h2>
      <div className="divide-y divide-border border border-border bg-card">{children}</div>
    </section>
  );
}

function Row({
  href,
  onClick,
  icon: Icon,
  label,
  current,
  expanded,
}: {
  href?: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  current?: boolean;
  expanded?: boolean;
}) {
  const inner = (
    <>
      <span className={cn("grid size-8 shrink-0 place-items-center bg-primary-soft text-primary", current && "bg-primary text-primary-foreground")}>
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <ChevronRight className={cn("size-5 shrink-0 text-soft transition-transform", expanded && "rotate-90")} aria-hidden />
    </>
  );
  const cls = "flex h-14 w-full items-center gap-3.5 px-4 text-[17px] text-ink active:bg-muted";
  if (href)
    return (
      <Link href={href} className={cls} aria-current={current ? "page" : undefined}>
        {inner}
      </Link>
    );
  return (
    <button type="button" onClick={onClick} className={cls} aria-expanded={expanded}>
      {inner}
    </button>
  );
}
