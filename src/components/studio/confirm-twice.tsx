"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * A two-step confirmation for anything hard to undo. Step one says plainly what will happen;
 * step two asks the author to type a word (DELETE) before the button works.
 */
export function ConfirmTwice({
  open,
  onClose,
  title,
  children,
  continueLabel = "Continue",
  confirmLabel,
  word = "DELETE",
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** what will happen, shown on the first step */
  children: React.ReactNode;
  continueLabel?: string;
  confirmLabel: string;
  word?: string;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      {/* the content unmounts when closed, so every opening starts again at step one */}
      <DialogContent>
        {open && (
          <Steps
            {...{
              onClose,
              title,
              continueLabel,
              confirmLabel,
              word,
              onConfirm,
              busy,
              setBusy,
            }}
          >
            {children}
          </Steps>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Steps({
  onClose,
  title,
  children,
  continueLabel,
  confirmLabel,
  word,
  onConfirm,
  busy,
  setBusy,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  continueLabel: string;
  confirmLabel: string;
  word: string;
  onConfirm: () => Promise<void>;
  busy: boolean;
  setBusy: (b: boolean) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");

  const matches = typed.trim().toUpperCase() === word.toUpperCase();

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!matches || busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {step === 1 ? (
        <div className="grid gap-4">
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-danger-soft text-destructive">
              <TriangleAlert className="size-5" />
            </span>
            <div className="grid gap-1">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription asChild>
                <div className="grid gap-2 text-sm text-ink-2">{children}</div>
              </DialogDescription>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setStep(2)}
            >
              {continueLabel}
            </Button>
          </div>
        </div>
      ) : (
        <form className="grid gap-4" onSubmit={confirm}>
          <div className="grid gap-1">
            <DialogTitle className="text-lg">Are you sure?</DialogTitle>
            <DialogDescription>
              This is your last check. Type{" "}
              <span className="font-mono font-semibold text-ink">{word}</span>{" "}
              to confirm.
            </DialogDescription>
          </div>
          <Input
            autoFocus
            aria-label={`Type ${word} to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={word}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          {error && (
            <p
              className="rounded bg-danger-soft p-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={busy}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!matches || busy}
            >
              {busy ? "Working…" : confirmLabel}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
