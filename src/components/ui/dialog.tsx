"use client";
import * as React from "react";
import { Dialog as DP } from "radix-ui";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DP.Root;
const DialogTrigger = DP.Trigger;
const DialogClose = DP.Close;
function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DP.Content>) {
  return (
    <DP.Portal>
      <DP.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DP.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg bg-card p-6 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
        <DP.Close className="absolute top-3 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </DP.Close>
      </DP.Content>
    </DP.Portal>
  );
}
const DialogTitle = ({ className, ...p }: React.ComponentProps<typeof DP.Title>) => <DP.Title className={cn("text-base font-semibold", className)} {...p} />;
const DialogDescription = ({ className, ...p }: React.ComponentProps<typeof DP.Description>) => <DP.Description className={cn("text-sm text-muted-foreground", className)} {...p} />;
export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogTitle, DialogDescription };
