"use client";

import Link from "next/link";
import { Check, Languages, X } from "lucide-react";
import { languageName } from "@/lib/translate";
import { dismissTranslateJob, useTranslateJob } from "@/lib/translate-job";

/** The corner card that follows a translation around the Desk, so the writer can walk away from it. */
export function TranslateProgress() {
  const job = useTranslateJob();
  if (!job) return null;
  const name = languageName(job.lang);
  const pct = job.step ? Math.round((job.step.done / job.step.total) * 100) : 0;
  return (
    <div role="status" className="fixed right-4 bottom-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-popover p-4 text-sm shadow-2xl">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          {job.made ? <Check className="size-4" /> : <Languages className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          {job.busy && (
            <>
              <p className="font-semibold">Making the {name} edition</p>
              <p className="truncate text-[12.5px] text-soft">
                {job.step ? `${job.step.done} of ${job.step.total}${job.step.label ? `: ${job.step.label}` : ""}` : "Starting…"}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper-2">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-[12px] text-soft">Keep working, it carries on. It will be in Your books when it&apos;s done.</p>
            </>
          )}
          {!job.busy && job.made && (
            <>
              <p className="font-semibold">Your {name} edition is ready</p>
              <p className="text-[12.5px] text-soft">It&apos;s in Your books under {name}.</p>
              <Link href={`/desk/books/${job.made.id}`} onClick={dismissTranslateJob} className="mt-1 inline-block font-medium text-primary hover:underline">
                Open {job.made.title}
              </Link>
            </>
          )}
          {!job.busy && job.error && (
            <>
              <p className="font-semibold text-destructive">The {name} edition stopped</p>
              <p className="text-[12.5px] text-ink-2">{job.error.text}</p>
            </>
          )}
        </div>
        {!job.busy && (
          <button type="button" onClick={dismissTranslateJob} aria-label="Close" className="grid size-7 place-items-center rounded-md text-soft hover:bg-muted hover:text-ink">
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
