"use client";
import * as React from "react";
import { Select as SP } from "radix-ui";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SP.Root;
const SelectValue = SP.Value;
function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SP.Trigger>) {
  return (
    <SP.Trigger
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm whitespace-nowrap data-[placeholder]:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring disabled:opacity-50 [&>span]:truncate",
        className,
      )}
      {...props}
    >
      {children}
      <SP.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-60" />
      </SP.Icon>
    </SP.Trigger>
  );
}
function SelectContent({ className, children, position = "popper", ...props }: React.ComponentProps<typeof SP.Content>) {
  return (
    <SP.Portal>
      <SP.Content
        position={position}
        className={cn(
          "relative z-50 max-h-80 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0",
          position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)] translate-y-1",
          className,
        )}
        {...props}
      >
        <SP.Viewport className="p-1">{children}</SP.Viewport>
      </SP.Content>
    </SP.Portal>
  );
}
function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SP.Item>) {
  return (
    <SP.Item
      className={cn("relative flex w-full cursor-default items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none data-[highlighted]:bg-muted data-[disabled]:opacity-50", className)}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SP.ItemIndicator>
          <CheckIcon className="size-4" />
        </SP.ItemIndicator>
      </span>
      <SP.ItemText>{children}</SP.ItemText>
    </SP.Item>
  );
}
export { Select, SelectValue, SelectTrigger, SelectContent, SelectItem };
