"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Library,
  Layers,
  Shield,
  ClipboardList,
  Zap,
  ChevronDown,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/series", label: "Series", icon: Library },
  { href: "/canon", label: "Canon", icon: Shield },
  { href: "/story", label: "Story", icon: BookOpen },
  {
    label: "Pages & Panels",
    icon: Layers,
    children: [
      { href: "/pages", label: "Page Planner" },
      { href: "/panels", label: "Panel Studio" },
    ],
  },
  { href: "/review", label: "Review Queue", icon: ClipboardList, badge: 8 },
];

interface SidebarNavItemProps {
  item: (typeof NAV_ITEMS)[number];
  onClose: () => void;
}

function NavItem({ item, onClose }: SidebarNavItemProps) {
  const pathname = usePathname();

  if ("children" in item && item.children) {
    const isAnyActive = item.children.some((c) => pathname === c.href);
    return (
      <div>
        <div className={cn(
          "flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium",
          isAnyActive ? "text-jollof-orange" : "text-jollof-subtext"
        )}>
          <item.icon size={16} className="shrink-0" />
          <span className="flex-1">{item.label}</span>
          <ChevronDown size={12} />
        </div>
        <div className="ml-6 mt-0.5 flex flex-col gap-0.5">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors",
                pathname === child.href
                  ? "text-jollof-orange bg-jollof-orange/10"
                  : "text-jollof-subtext hover:text-jollof-text hover:bg-jollof-panel"
              )}
            >
              {child.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (!("href" in item)) return null;
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px]",
        isActive
          ? "text-jollof-orange bg-jollof-orange/10 border border-jollof-orange/20"
          : "text-jollof-subtext hover:text-jollof-text hover:bg-jollof-panel"
      )}
    >
      <item.icon size={16} className="shrink-0" />
      <span className="flex-1">{item.label}</span>
      {"badge" in item && item.badge ? (
        <span className="text-xs bg-jollof-orange text-black font-bold px-1.5 py-0.5 rounded-full tabular-nums">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar — always visible lg+ */}
      <aside className="hidden lg:flex w-52 shrink-0 flex-col bg-[#0f0d08] border-r border-jollof-border min-h-screen">
        <SidebarContent onClose={onClose} />
      </aside>

      {/* Mobile drawer — slides in from left */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-[#0f0d08] border-r border-jollof-border transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-md text-jollof-label hover:text-jollof-text hover:bg-jollof-panel transition-colors"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  );
}

function SidebarContent({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-jollof-border">
        <Link href="/" onClick={onClose} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-jollof-orange flex items-center justify-center shrink-0">
            <Zap size={14} className="text-black" />
          </div>
          <div>
            <div className="text-sm font-bold text-jollof-text leading-none">Jollof Pages</div>
            <div className="text-[10px] text-jollof-label leading-none mt-0.5">Story Engine</div>
          </div>
        </Link>
      </div>

      {/* Series selector */}
      <div className="px-3 py-3 border-b border-jollof-border">
        <Link
          href="/series"
          onClick={onClose}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-jollof-panel transition-colors group"
        >
          <div className="w-6 h-6 rounded bg-amber-900/60 border border-amber-700/40 flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-amber-400">EQ</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-jollof-text truncate">Equanauts</div>
            <div className="text-[10px] text-jollof-label">Book 1 · Active</div>
          </div>
          <ChevronDown size={12} className="text-jollof-label shrink-0" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item, i) => (
          <NavItem key={i} item={item} onClose={onClose} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-jollof-border space-y-1">
        <div className="px-2 py-2 rounded-md flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-jollof-orange/20 border border-jollof-orange/30 flex items-center justify-center shrink-0">
            <Zap size={10} className="text-jollof-orange" />
          </div>
          <div>
            <div className="text-[10px] font-medium text-jollof-orange">Creator Mode</div>
            <div className="text-[9px] text-jollof-label">Workspace</div>
          </div>
        </div>
        <Link
          href="#"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-jollof-panel transition-colors min-h-[44px]"
        >
          <User size={13} className="text-jollof-label" />
          <span className="text-xs text-jollof-subtext">Amaete Umanah</span>
        </Link>
        <div className="px-2">
          <span className="text-[9px] text-jollof-label/60 italic">Prototype · Story OS pending</span>
        </div>
      </div>
    </>
  );
}
