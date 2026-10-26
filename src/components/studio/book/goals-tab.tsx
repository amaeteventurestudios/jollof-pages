"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WordChart } from "@/components/studio/word-chart";
import { loadLogs } from "@/lib/studio";
import { fmt, goalPlan, streak, wordsByDay } from "@/lib/progress";
import { today } from "@/lib/slug";
import { bookGoal, type BookGoal, type WritingLog } from "@/lib/types";
import type { Workspace } from "./workspace";

export function GoalsTab({ ws }: { ws: Workspace }) {
  const goal = bookGoal(ws.book);
  const [draft, setDraft] = useState<BookGoal>(goal);
  const [logs, setLogs] = useState<WritingLog[]>([]);
  useEffect(() => {
    loadLogs(60, ws.book.id).then(setLogs);
  }, [ws.book.id]);
  const written = ws.book.word_count || 0;
  const plan = goalPlan(draft, written);
  const byDay = wordsByDay(logs);
  const save = (g: BookGoal) => ws.saveBook({ goal: g });

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-8 sm:px-8">
      <section className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
        <div className="grid h-fit gap-4">
          <h2 className="text-lg font-medium">Book goal</h2>
          <div className="grid gap-1.5">
            <Label htmlFor="g-target">Target length (words)</Label>
            <Input
              id="g-target"
              type="number"
              min={1000}
              step={1000}
              value={draft.targetWords}
              onChange={(e) => setDraft({ ...draft, targetWords: Number(e.target.value) })}
              onBlur={() => save(draft)}
            />
            <p className="text-[13px] text-soft">Most practical non-fiction runs 30,000 to 60,000 words.</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="g-deadline">Finish by</Label>
            <Input id="g-deadline" type="date" min={today()} value={draft.deadline} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} onBlur={() => save(draft)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="g-daily">Daily habit (words)</Label>
            <Input id="g-daily" type="number" min={50} step={50} value={draft.dailyWords} onChange={(e) => setDraft({ ...draft, dailyWords: Number(e.target.value) })} onBlur={() => save(draft)} />
          </div>
        </div>
        <div className="rounded-md bg-ink p-6 text-paper">
          <p className="text-sm text-paper/75">Progress</p>
          <p className="tabular mt-1 text-[clamp(2.5rem,6vw,4rem)] leading-none tracking-[-0.02em]">{plan.percent}%</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper/20" aria-hidden>
            <div className="h-full bg-[#5bc48a]" style={{ width: `${plan.percent}%` }} />
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-paper/75">Written</dt>
              <dd className="tabular text-xl">{fmt(written)}</dd>
            </div>
            <div>
              <dt className="text-paper/75">Still to write</dt>
              <dd className="tabular text-xl">{fmt(plan.remaining)}</dd>
            </div>
            <div>
              <dt className="text-paper/75">Days left</dt>
              <dd className="tabular text-xl">{plan.daysLeft ?? "No deadline"}</dd>
            </div>
            <div>
              <dt className="text-paper/75">Needed per day</dt>
              <dd className="tabular text-xl">{plan.perDay !== null ? fmt(plan.perDay) : "Set a date"}</dd>
            </div>
          </dl>
          {plan.onTrack !== null && (
            <p className="mt-6 text-sm">
              {plan.onTrack
                ? `Your ${fmt(draft.dailyWords)}-word habit gets you there on time.`
                : `At ${fmt(draft.dailyWords)} words a day you will miss the date. Raise the habit to ${fmt(plan.perDay ?? 0)} or move the deadline.`}
            </p>
          )}
        </div>
      </section>
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-medium">Last 30 days</h2>
          <p className="text-sm text-soft">
            Streak: {streak(byDay, 1)} days · Habit met on {[...byDay.values()].filter((w) => w >= draft.dailyWords).length} days
          </p>
        </div>
        <WordChart byDay={byDay} days={30} goal={draft.dailyWords} />
      </section>
    </div>
  );
}
