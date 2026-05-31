import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  color?: string;
  trend?: "up" | "down" | "stable";
  className?: string;
}

export function MetricCard({ label, value, sub, icon: Icon, color = "text-jollof-orange", className }: MetricCardProps) {
  return (
    <div className={cn("jollof-card p-4 flex flex-col gap-1 w-full max-w-sm mx-auto", className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-jollof-label uppercase tracking-wider font-medium">{label}</span>
        {Icon && <Icon size={14} className="text-jollof-label" />}
      </div>
      <div className={cn("text-2xl font-bold tabular-nums", color)}>{value}</div>
      {sub && <div className="text-xs text-jollof-subtext">{sub}</div>}
    </div>
  );
}
