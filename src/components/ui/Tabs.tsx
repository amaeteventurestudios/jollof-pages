"use client";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: "default" | "pill";
}

export function Tabs({ tabs, active, onChange, className, variant = "default" }: TabsProps) {
  if (variant === "pill") {
    return (
      <div className={cn("flex items-center gap-1 p-1 bg-jollof-panel rounded-lg border border-jollof-border", className)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all",
              active === tab.id
                ? "bg-jollof-orange text-black"
                : "text-jollof-subtext hover:text-jollof-text"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full tabular-nums",
                active === tab.id ? "bg-black/20 text-black" : "bg-jollof-border text-jollof-label"
              )}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-0 border-b border-jollof-border", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px",
            active === tab.id
              ? "border-jollof-orange text-jollof-orange"
              : "border-transparent text-jollof-subtext hover:text-jollof-text"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-jollof-border text-jollof-label tabular-nums">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
