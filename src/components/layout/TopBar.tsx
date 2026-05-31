"use client";
import { Bell, Search, Settings, Sun } from "lucide-react";

export function TopBar() {
  return (
    <header className="h-12 shrink-0 flex items-center gap-3 px-4 border-b border-jollof-border bg-[#0f0d08]/80 backdrop-blur-sm">
      {/* Search */}
      <div className="flex-1 max-w-xs relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-jollof-label" />
        <input
          placeholder="Search projects..."
          className="w-full bg-jollof-surface border border-jollof-border rounded-md pl-8 pr-3 py-1.5 text-xs text-jollof-text placeholder:text-jollof-label focus:outline-none focus:border-jollof-orange/40 transition-colors"
        />
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button className="p-2 rounded-md text-jollof-label hover:text-jollof-text hover:bg-jollof-panel transition-colors relative">
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-jollof-orange" />
        </button>
        <button className="p-2 rounded-md text-jollof-label hover:text-jollof-text hover:bg-jollof-panel transition-colors">
          <Settings size={15} />
        </button>
        <button className="p-2 rounded-md text-jollof-label hover:text-jollof-text hover:bg-jollof-panel transition-colors">
          <Sun size={15} />
        </button>
      </div>
    </header>
  );
}
