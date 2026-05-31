"use client";
import { useState } from "react";
import { Bell, Search, Settings, Menu, X } from "lucide-react";

interface TopBarProps {
  onMenuToggle: () => void;
}

export function TopBar({ onMenuToggle }: TopBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="h-12 shrink-0 flex items-center gap-2 px-3 sm:px-4 border-b border-jollof-border bg-[#0f0d08]/80 backdrop-blur-sm">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-md text-jollof-label hover:text-jollof-text hover:bg-jollof-panel transition-colors shrink-0"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      {/* Logo — mobile only (desktop shows in sidebar) */}
      <div className="lg:hidden flex items-center gap-1.5 shrink-0">
        <div className="w-6 h-6 rounded bg-jollof-orange flex items-center justify-center">
          <span className="text-black font-black text-[10px]">JP</span>
        </div>
        <span className="text-sm font-bold text-jollof-text">Jollof Pages</span>
      </div>

      {/* Search — collapsed on mobile, expanded on sm+ */}
      {searchOpen ? (
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-jollof-label" />
            <input
              autoFocus
              placeholder="Search projects..."
              className="w-full bg-jollof-surface border border-jollof-border rounded-md pl-8 pr-3 py-1.5 text-xs text-jollof-text placeholder:text-jollof-label focus:outline-none focus:border-jollof-orange/40 transition-colors"
            />
          </div>
          <button
            onClick={() => setSearchOpen(false)}
            className="p-2 text-jollof-label hover:text-jollof-text"
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <>
          {/* Desktop search */}
          <div className="hidden sm:flex flex-1 max-w-xs relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-jollof-label" />
            <input
              placeholder="Search projects..."
              className="w-full bg-jollof-surface border border-jollof-border rounded-md pl-8 pr-3 py-1.5 text-xs text-jollof-text placeholder:text-jollof-label focus:outline-none focus:border-jollof-orange/40 transition-colors"
            />
          </div>

          <div className="flex-1" />

          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="sm:hidden p-2 rounded-md text-jollof-label hover:text-jollof-text hover:bg-jollof-panel transition-colors"
          >
            <Search size={15} />
          </button>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <button className="p-2 rounded-md text-jollof-label hover:text-jollof-text hover:bg-jollof-panel transition-colors relative">
              <Bell size={15} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-jollof-orange" />
            </button>
            <button className="hidden sm:flex p-2 rounded-md text-jollof-label hover:text-jollof-text hover:bg-jollof-panel transition-colors">
              <Settings size={15} />
            </button>
          </div>
        </>
      )}
    </header>
  );
}
