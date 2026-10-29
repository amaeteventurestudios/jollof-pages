"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock, GraduationCap, LifeBuoy, Lightbulb } from "lucide-react";
import { StudioNav } from "@/components/studio/studio-nav";
import { VideoLibrary, VideoPlayer, VideoStrip } from "@/components/studio/video-guides";
import { Button } from "@/components/ui/button";
import { TUTORIALS, loadDone, saveDone } from "@/lib/tutorials";
import { cn } from "@/lib/utils";

/** Learn: short guides from a blank page to a published book, with progress kept in this browser. */
export default function LearnPage() {
  // the studio renders only in the browser, after sign-in, so storage can seed state
  const [done, setDone] = useState<Set<string>>(loadDone);
  const [openId, setOpenId] = useState<string>(() => TUTORIALS.find((g) => !done.has(g.id))?.id ?? TUTORIALS[0].id);
  const index = TUTORIALS.findIndex((t) => t.id === openId);
  const t = TUTORIALS[index];
  const pct = Math.round((done.size / TUTORIALS.length) * 100);
  // /studio/learn#video=<id> opens that video, so the help page and emails can link to one
  const [playing, setPlaying] = useState<string | null>(() => /^#video=([\w-]+)$/.exec(window.location.hash)?.[1] ?? null);

  function mark(id: string, value: boolean) {
    const next = new Set(done);
    if (value) next.add(id);
    else next.delete(id);
    setDone(next);
    saveDone(next);
  }

  function go(i: number) {
    setOpenId(TUTORIALS[i].id);
    document.getElementById("guide")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium tracking-[0.12em] text-primary uppercase">
              <GraduationCap className="size-4" /> Learn
            </p>
            <h1 className="mt-2 text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-[-0.02em]">From first chapter to published book</h1>
            <p className="mt-1 max-w-2xl text-soft">
              Ten short guides, about forty minutes in all. Tick each one off as you go; your progress is kept on this device. Prefer to watch?{" "}
              <a href="#videos" className="text-primary underline">
                There is a video for every feature
              </a>
              .
            </p>
          </div>
          <div className="min-w-56">
            <p className="flex justify-between text-sm">
              <span className="text-soft">Your progress</span>
              <span className="tabular font-medium">
                {done.size} of {TUTORIALS.length}
              </span>
            </p>
            <div className="mt-1.5 h-2 overflow-hidden bg-paper-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Guides completed">
              <div className="h-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          <nav aria-label="Guides" className="lg:sticky lg:top-20 lg:self-start">
            <ol className="grid gap-1">
              {TUTORIALS.map((g, i) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={g.id === openId ? "step" : undefined}
                    className={cn("flex w-full items-center gap-3 border px-3 py-2.5 text-left transition-colors", g.id === openId ? "border-primary bg-primary-soft" : "border-transparent hover:bg-card")}
                  >
                    <span
                      className={cn(
                        "tabular grid size-7 shrink-0 place-items-center text-[13px] font-medium",
                        done.has(g.id) ? "bg-primary text-primary-foreground" : g.id === openId ? "border border-primary text-primary" : "border border-border text-soft",
                      )}
                    >
                      {done.has(g.id) ? <Check className="size-4" /> : i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block truncate text-sm font-medium", g.id === openId && "text-primary")}>{g.title}</span>
                      <span className="block text-xs text-soft">
                        {g.minutes} min · {g.where}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <article id="guide" className="scroll-mt-20 border border-border bg-card">
            <header className="relative overflow-hidden border-b border-border bg-primary px-6 py-8 text-primary-foreground sm:px-10">
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:repeating-linear-gradient(135deg,currentColor_0_1px,transparent_1px_12px)]" />
              <div className="relative">
                <p className="text-sm opacity-85">
                  Guide {index + 1} of {TUTORIALS.length}
                </p>
                <h2 className="mt-1 text-[clamp(1.5rem,2.6vw,2.1rem)] leading-tight tracking-[-0.02em]">{t.title}</h2>
                <p className="mt-2 max-w-xl opacity-90">{t.summary}</p>
                <p className="mt-4 flex flex-wrap gap-4 text-sm opacity-85">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4" /> {t.minutes} minutes
                  </span>
                  <span>Where: {t.where}</span>
                </p>
              </div>
            </header>
            <VideoStrip tutorial={t.id} onPlay={setPlaying} />
            <ol className="grid gap-0 px-6 py-6 sm:px-10">
              {t.steps.map((s, i) => (
                <li key={s.title} className="relative grid grid-cols-[2.5rem_1fr] gap-3 pb-6 last:pb-0">
                  {i < t.steps.length - 1 && <span aria-hidden className="absolute top-9 bottom-0 left-[1.2rem] w-px bg-border" />}
                  <span className="tabular grid size-10 place-items-center border border-primary text-lg font-medium text-primary">{i + 1}</span>
                  <div className="pt-1.5">
                    <h3 className="font-medium">{s.title}</h3>
                    <p className="mt-1 max-w-[62ch] text-ink-2">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            {t.tip && (
              <p className="mx-6 mb-6 flex gap-3 bg-paper-2 p-4 text-sm text-ink-2 sm:mx-10">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                {t.tip}
              </p>
            )}
            <footer className="flex flex-wrap items-center gap-2 border-t border-border px-6 py-4 sm:px-10">
              <Button variant="outline" disabled={index === 0} onClick={() => go(index - 1)}>
                <ArrowLeft /> Previous
              </Button>
              {done.has(t.id) ? (
                <Button variant="outline" onClick={() => mark(t.id, false)}>
                  <Check /> Done
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    mark(t.id, true);
                    if (index < TUTORIALS.length - 1) go(index + 1);
                  }}
                >
                  <Check /> Mark as done{index < TUTORIALS.length - 1 ? " and continue" : ""}
                </Button>
              )}
              {index < TUTORIALS.length - 1 && (
                <Button variant="ghost" onClick={() => go(index + 1)} className="ml-auto">
                  Next <ArrowRight />
                </Button>
              )}
            </footer>
          </article>
        </div>

        <VideoLibrary onPlay={setPlaying} />
        <VideoPlayer id={playing} onChange={setPlaying} />

        <p className="mt-10 flex items-center gap-2 text-soft">
          <LifeBuoy className="size-4 text-primary" />
          <span>
            Stuck on something?{" "}
            <Link href="/studio/help#contact" className="text-primary underline">
              Ask us on the Help page
            </Link>
            .
          </span>
        </p>
      </main>
    </>
  );
}
