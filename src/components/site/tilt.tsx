"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Leans its child toward the pointer. Does nothing for touch. */
export function Tilt({ children, className, max = 10 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={cn("tilt", className)}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        ref.current.style.setProperty("--ry", `${x * max * 2}deg`);
        ref.current.style.setProperty("--rx", `${-y * max}deg`);
      }}
      onPointerLeave={() => {
        ref.current?.style.setProperty("--ry", "0deg");
        ref.current?.style.setProperty("--rx", "0deg");
      }}
    >
      {children}
    </div>
  );
}
