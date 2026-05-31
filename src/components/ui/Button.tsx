import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  children,
  className,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-jollof-orange text-black font-semibold hover:bg-orange-400 border border-orange-500/50",
    secondary: "bg-jollof-panel text-jollof-text border border-jollof-border hover:border-jollof-orange/40 hover:bg-jollof-muted/40",
    ghost: "text-jollof-subtext hover:text-jollof-text hover:bg-jollof-panel/60 border border-transparent",
    danger: "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20",
    outline: "bg-transparent text-jollof-orange border border-jollof-orange/40 hover:bg-jollof-orange/10",
  };
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-3.5 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-sm gap-2.5",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {Icon && <Icon size={size === "sm" ? 13 : 15} />}
      {children}
      {IconRight && <IconRight size={size === "sm" ? 13 : 15} />}
    </button>
  );
}
