"use client";
import * as React from "react";
import { Checkbox as CP } from "radix-ui";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CP.Root>) {
  return (
    <CP.Root
      className={cn(
        "peer size-4 shrink-0 rounded-[4px] border border-input bg-card data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <CP.Indicator className="flex items-center justify-center">
        <CheckIcon className="size-3.5" />
      </CP.Indicator>
    </CP.Root>
  );
}
export { Checkbox };
