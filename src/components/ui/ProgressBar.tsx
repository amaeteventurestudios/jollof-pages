import { cn, progressColor } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: string;
  height?: string;
}

export function ProgressBar({
  value,
  max = 100,
  className,
  showLabel = false,
  color,
  height = "h-1.5",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = color ?? progressColor(pct);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex-1 bg-jollof-border rounded-full overflow-hidden", height)}>
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-jollof-subtext tabular-nums w-8 text-right">{pct}%</span>
      )}
    </div>
  );
}
