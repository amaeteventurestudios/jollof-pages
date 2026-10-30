"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEME_KEY } from "@/lib/theme";

type Theme = "light" | "dark";

/** Switches between day and night and remembers the choice on this device. */
export function ThemeToggle({ className, label = false }: { className?: string; label?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const read = () => setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className={cn("inline-flex items-center gap-2", className)}
      aria-label={label ? undefined : `Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {}
      }}
    >
      {theme === "dark" ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
      {label && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}

export type ThemeChoice = Theme | "system";

/** The saved colour choice ("system" follows the device), and a setter that applies it at once. */
export function useThemeChoice(): [ThemeChoice, (c: ThemeChoice) => void] {
  // only shown inside menus that open after a click, so reading storage up front can't mismatch the server
  const [choice, setChoice] = useState<ThemeChoice>(() => {
    try {
      const s = typeof window === "undefined" ? null : localStorage.getItem(THEME_KEY);
      return s === "light" || s === "dark" ? s : "system";
    } catch {
      return "system";
    }
  });
  return [
    choice,
    (c) => {
      setChoice(c);
      const d = document.documentElement;
      try {
        if (c === "system") localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, c);
      } catch {}
      d.dataset.theme = c === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : c;
    },
  ];
}
