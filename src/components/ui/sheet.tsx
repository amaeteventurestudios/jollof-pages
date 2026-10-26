"use client";
import * as React from "react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & { side?: "right" | "left" | "bottom" }) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
      <SheetPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-card shadow-xl transition ease-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-200 data-[state=closed]:duration-150",
          side === "right" && "inset-y-0 right-0 h-full w-full sm:max-w-md data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
          side === "left" && "inset-y-0 left-0 h-full w-72 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
          side === "bottom" && "inset-x-0 bottom-0 max-h-[88vh] rounded-t-xl data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          className,
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute top-3 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
const SheetHeader = ({ className, ...p }: React.ComponentProps<"div">) => <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...p} />;
const SheetTitle = ({ className, ...p }: React.ComponentProps<typeof SheetPrimitive.Title>) => <SheetPrimitive.Title className={cn("text-base font-semibold pr-8", className)} {...p} />;
const SheetDescription = ({ className, ...p }: React.ComponentProps<typeof SheetPrimitive.Description>) => (
  <SheetPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...p} />
);
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetDescription };
