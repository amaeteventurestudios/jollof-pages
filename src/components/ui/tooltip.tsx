"use client";
import * as React from "react";
import { Tooltip as TP } from "radix-ui";
import { cn } from "@/lib/utils";

const TooltipProvider = ({ delayDuration = 150, ...p }: React.ComponentProps<typeof TP.Provider>) => <TP.Provider delayDuration={delayDuration} {...p} />;
const Tooltip = TP.Root;
const TooltipTrigger = TP.Trigger;
function TooltipContent({ className, sideOffset = 4, children, ...props }: React.ComponentProps<typeof TP.Content>) {
  return (
    <TP.Portal>
      <TP.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn("z-50 max-w-xs rounded-md bg-ink px-2.5 py-1.5 text-xs leading-relaxed text-paper shadow-md data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0", className)}
        {...props}
      >
        {children}
      </TP.Content>
    </TP.Portal>
  );
}
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
