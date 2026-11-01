"use client";
import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const Tabs = ({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.Root>) => <TabsPrimitive.Root className={cn("flex flex-col gap-3", className)} {...p} />;
const TabsList = ({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List className={cn("inline-flex items-center gap-1 border-b border-border w-full overflow-x-auto", className)} {...p} />
);
const TabsTrigger = ({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn(
      "relative -mb-px inline-flex h-9 items-center px-3 text-sm font-medium text-muted-foreground border-b-2 border-transparent whitespace-nowrap hover:text-foreground data-[state=active]:text-foreground data-[state=active]:border-primary",
      className,
    )}
    {...p}
  />
);
const TabsContent = ({ className, ...p }: React.ComponentProps<typeof TabsPrimitive.Content>) => <TabsPrimitive.Content className={cn("outline-none", className)} {...p} />;
export { Tabs, TabsList, TabsTrigger, TabsContent };
