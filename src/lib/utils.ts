import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    approved: "text-green-400 bg-green-400/10 border-green-400/20",
    locked: "text-green-300 bg-green-300/10 border-green-300/20",
    draft: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    flagged: "text-red-400 bg-red-400/10 border-red-400/20",
    outline: "text-jollof-subtext bg-jollof-muted/30 border-jollof-border",
    confirmed: "text-green-400 bg-green-400/10 border-green-400/20",
    suggested: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    disputed: "text-red-400 bg-red-400/10 border-red-400/20",
    deprecated: "text-gray-500 bg-gray-500/10 border-gray-500/20",
    critical: "text-red-400 bg-red-400/10 border-red-400/20",
    warning: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    active: "text-jollof-orange bg-jollof-orange/10 border-jollof-orange/20",
    in_progress: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    review: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    unassigned: "text-gray-500 bg-gray-500/10 border-gray-500/20",
  };
  return map[status] ?? "text-gray-400 bg-gray-400/10 border-gray-400/20";
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: "text-red-400",
    warning: "text-amber-400",
    info: "text-blue-400",
    success: "text-green-400",
  };
  return map[severity] ?? "text-gray-400";
}

export function progressColor(pct: number): string {
  if (pct >= 80) return "bg-green-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-jollof-orange";
}
