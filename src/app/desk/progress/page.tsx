"use client";

import { useEffect, useState } from "react";
import { StudioNav } from "@/components/studio/studio-nav";
import { WordChart } from "@/components/studio/word-chart";
import { listBooks, loadLogs } from "@/lib/studio";
import { fmt, goalPlan, lastDays, streak, wordsByDay } from "@/lib/progress";
import { bookGoal, type Book, type WritingLog } from "@/lib/types";
import { errorMessage } from "@/lib/pb";

export default function ProgressPage() {
  const [logs, setLogs] = useState<WritingLog[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    Promise.all([loadLogs(365), listBooks()])
      .then(([l, b]) => {
        setLogs(l);
        setBooks(b);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  const byDay = wordsByDay(logs);
  const year = lastDays(364);
  const max = Math.max(1, ...year.map((d) => byDay.get(d) ?? 0));
  const minutes = logs.reduce((s, l) => s + ((l as WritingLog & { minutes?: number }).minutes || 0), 0);
  const best = Math.max(0, ...byDay.values());

  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] tracking-[-0.02em]">Writing progress</h1>
        {error && <p className="mt-4 text-destructive">{error}</p>}
        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md bg-border sm:grid-cols-4">
          {[
            ["Current streak", `${streak(byDay)} days`],
            ["Words this year", fmt([...byDay.values()].reduce((s, w) => s + Math.max(w, 0), 0))],
            ["Best day", fmt(best)],
            ["Sprint minutes", fmt(minutes)],
          ].map(([k, v]) => (
            <div key={k} className="bg-card p-5">
              <dt className="text-sm text-soft">{k}</dt>
              <dd className="tabular mt-1 text-2xl">{v}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-10">
          <h2 className="text-lg font-medium">The last year</h2>
          <div className="mt-4 overflow-x-auto rounded-md bg-card p-4">
            <div className="grid w-max grid-flow-col grid-rows-7 gap-[3px]" role="img" aria-label="Words written per day over the last year">
              {year.map((d) => {
                const w = Math.max(byDay.get(d) ?? 0, 0);
                const level = w === 0 ? 0 : Math.ceil((w / max) * 4);
                const bg = ["var(--paper-3)", "#f0c7ad", "#e0915f", "#c65a2a", "#8a2c10"][level];
                return <span key={d} title={`${d}: ${fmt(w)} words`} className="size-3 rounded-[2px]" style={{ background: bg }} />;
              })}
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-medium">Last 30 days</h2>
          <WordChart byDay={byDay} days={30} />
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-medium">Books</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-soft">
                <th className="py-2 font-normal">Book</th>
                <th className="py-2 text-right font-normal">Words</th>
                <th className="py-2 text-right font-normal">Goal</th>
                <th className="py-2 text-right font-normal">Per day needed</th>
              </tr>
            </thead>
            <tbody>
              {books.map((b) => {
                const g = bookGoal(b);
                const p = goalPlan(g, b.word_count || 0);
                return (
                  <tr key={b.id} className="border-t border-border">
                    <td className="py-2.5">{b.title}</td>
                    <td className="tabular py-2.5 text-right">{fmt(b.word_count || 0)}</td>
                    <td className="tabular py-2.5 text-right">
                      {fmt(g.targetWords)} ({p.percent}%)
                    </td>
                    <td className="tabular py-2.5 text-right">{p.perDay !== null ? fmt(p.perDay) : "No deadline"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
