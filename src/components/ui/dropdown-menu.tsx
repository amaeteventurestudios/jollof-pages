"use client";
import * as React from "react";
import { DropdownMenu as DM } from "radix-ui";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenu = DM.Root;
const DropdownMenuTrigger = DM.Trigger;
const DropdownMenuGroup = DM.Group;
const DropdownMenuRadioGroup = DM.RadioGroup;

function DropdownMenuContent({ className, sideOffset = 4, ...props }: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        data-slot="dropdown-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      />
    </DM.Portal>
  );
}
const itemCls =
  "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-muted data-[disabled]:opacity-50 [&_svg]:size-4";
const DropdownMenuItem = ({ className, ...p }: React.ComponentProps<typeof DM.Item>) => <DM.Item data-slot="dropdown-item" className={cn(itemCls, className)} {...p} />;
function DropdownMenuRadioItem({ className, children, ...p }: React.ComponentProps<typeof DM.RadioItem>) {
  return (
    <DM.RadioItem data-slot="dropdown-item" className={cn(itemCls, "pl-8", className)} {...p}>
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <DM.ItemIndicator>
          <CheckIcon className="size-4" />
        </DM.ItemIndicator>
      </span>
      {children}
    </DM.RadioItem>
  );
}
function DropdownMenuCheckboxItem({ className, children, ...p }: React.ComponentProps<typeof DM.CheckboxItem>) {
  return (
    <DM.CheckboxItem data-slot="dropdown-item" className={cn(itemCls, "pl-8", className)} {...p}>
      <span className="absolute left-2 flex size-3.5 items-center justify-center">
        <DM.ItemIndicator>
          <CheckIcon className="size-4" />
        </DM.ItemIndicator>
      </span>
      {children}
    </DM.CheckboxItem>
  );
}
const DropdownMenuLabel = ({ className, ...p }: React.ComponentProps<typeof DM.Label>) => (
  <DM.Label className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)} {...p} />
);
const DropdownMenuSeparator = ({ className, ...p }: React.ComponentProps<typeof DM.Separator>) => <DM.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...p} />;

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
