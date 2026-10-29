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
          // phones and tablets: a sheet that rises from the bottom edge, as in a native app
          "app:top-auto app:bottom-0 app:left-0 app:max-h-[92dvh] app:w-full app:max-w-none app:translate-x-0 app:translate-y-0 app:overflow-y-auto app:overscroll-contain app:rounded-none app:border-t app:border-border app:px-5 app:pt-8 app:pb-[calc(1.5rem+env(safe-area-inset-bottom))] app:data-[state=open]:zoom-in-100 app:data-[state=open]:slide-in-from-bottom app:data-[state=open]:fade-in-100 app:sm:max-h-[85dvh]",
        )}
        {...props}
      >
        {children}
        <span aria-hidden className="absolute top-2.5 left-1/2 hidden h-1 w-10 -translate-x-1/2 bg-paper-3 app:block" />
        <DP.Close className="absolute top-3 right-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground app:top-2 app:right-2 app:grid app:size-11 app:place-items-center">
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
