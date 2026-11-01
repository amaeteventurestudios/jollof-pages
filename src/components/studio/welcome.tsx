"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, FileUp, FlaskConical, Globe, LifeBuoy, PenLine, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { pb } from "@/lib/pb";
import { useBrand } from "@/components/brand";
import { cn } from "@/lib/utils";

const KEY = "jp-welcome-v1";

/** Brings the welcome back on the next visit to the studio home. */
export function replayWelcome() {
  localStorage.removeItem(KEY);
}

interface Card {
  icon: typeof PenLine;
  title: string;
  text: string;
  links?: { href: string; label: string }[];
}

const TESTER: Card = {
  icon: FlaskConical,
  title: "Welcome, you're a tester",
  text: "Every feature is open to you for free. Use it on a real book if you can: write, design a cover, format it for KDP and put it on your website. Then tell us what worked and what didn't.",
};
const CARDS: Card[] = [
  {
    icon: PenLine,
    title: "Write",
    text: "Start a new book from the home page, or bring the one you already have: a Word file (.docx) or Markdown comes in with its chapters, headings and italics.",
    links: [{ href: "/studio/learn", label: "Watch the short guides" }],
  },
  {
    icon: Sparkles,
    title: "Design and publish",
    text: "On a book's Cover tab, make a cover with AI or refit one you already have to the right KDP size. The Export tab builds your paperback and hardcover PDFs and the Kindle EPUB. Your author website shows your books with buy links.",
    links: [{ href: "/studio/site", label: "Set up your website" }],
  },
  {
    icon: LifeBuoy,
    title: "Tell us",
    text: "Something broken or confusing? Open a ticket and add a screenshot; we answer within one working day. Wish it did something else? Suggest it on the ideas board and vote on others'.",
    links: [
      { href: "/studio/help#contact", label: "Report a problem" },
      { href: "/studio/ideas", label: "Suggest a feature" },
    ],
  },
];

/**
 * A short welcome on the first visit to the studio: four cards for testers, three for everyone
 * else. Skippable, shown once per browser, and it can be replayed from Help.
 */
export function Welcome() {
  const record = pb().authStore.record;
  const tester = Boolean(record?.tester_invite);
  const brand = useBrand();
  const cards = tester
    ? [TESTER, ...CARDS]
    : [{ ...TESTER, icon: FileUp, title: `Welcome to ${brand?.name || "Jollof Pages"}`, text: "A quick tour of the three things you'll do here. It takes half a minute." }, ...CARDS];
  // the studio renders client-only, after the sign-in check, so localStorage is readable here
  const [open, setOpen] = useState(() => record?.access !== "collaborator" && !localStorage.getItem(KEY));
  const [i, setI] = useState(0);
  const close = () => {
    localStorage.setItem(KEY, new Date().toISOString());
    setOpen(false);
  };
  const c = cards[i];
  const last = i === cards.length - 1;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-xl gap-0 p-0">
        <div className="bg-primary px-6 pt-7 pb-6 text-primary-foreground">
          <c.icon className="size-7" aria-hidden />
          <DialogTitle className="mt-3 text-xl">{c.title}</DialogTitle>
        </div>
        <div className="grid gap-4 px-6 py-5">
          <DialogDescription className="text-[15px] leading-relaxed text-ink-2">{c.text}</DialogDescription>
          {c.links && (
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {c.links.map((l) => (
                <Link key={l.href} href={l.href} onClick={close} className="font-medium text-primary hover:underline">
                  {l.label}
                </Link>
              ))}
            </p>
          )}
          {tester && i === 0 && !brand && (
            <p className="flex items-center gap-2 text-[13px] text-soft">
              <Globe className="size-4" /> Jollof Studio, our design tool, is free too, with its own account at studio.jollofpages.com.
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <span className="flex gap-1.5" aria-label={`Card ${i + 1} of ${cards.length}`}>
              {cards.map((_, n) => (
                <span key={n} className={cn("h-1.5 w-6", n === i ? "bg-primary" : "bg-paper-3")} />
              ))}
            </span>
            <span className="ml-auto flex gap-2">
              {i === 0 ? (
                <Button variant="ghost" size="sm" onClick={close}>
                  Skip
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setI(i - 1)}>
                  <ArrowLeft /> Back
                </Button>
              )}
              <Button size="sm" onClick={() => (last ? close() : setI(i + 1))}>
                {last ? "Start writing" : "Next"} {!last && <ArrowRight />}
              </Button>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
