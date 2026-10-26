"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PromptDialog(props: {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  initial?: string;
  multiline?: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()}>
      <DialogContent>{props.open && <PromptForm {...props} />}</DialogContent>
    </Dialog>
  );
}

function PromptForm({ title, label, placeholder, initial, multiline, onClose, onSubmit }: Parameters<typeof PromptDialog>[0]) {
  const [value, setValue] = useState(initial ?? "");
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSubmit(value.trim());
        onClose();
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <div className="grid gap-1.5">
        <Label htmlFor="prompt-value">{label}</Label>
        {multiline ? (
          <Textarea id="prompt-value" autoFocus value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} />
        ) : (
          <Input id="prompt-value" autoFocus value={value} placeholder={placeholder} onChange={(e) => setValue(e.target.value)} />
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Add</Button>
      </div>
    </form>
  );
}
