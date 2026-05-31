import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4 text-center w-full max-w-lg mx-auto", className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-jollof-panel border border-jollof-border flex items-center justify-center mb-4">
          <Icon size={20} className="text-jollof-label" />
        </div>
      )}
      <p className="text-sm font-medium text-jollof-subtext mb-1">{title}</p>
      {description && <p className="text-xs text-jollof-label max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
