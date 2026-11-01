"use client";

import { useEffect, useState } from "react";
import { ago, call, Columns, CsvButton, date, Loading, num, PageHead, Panel, Problem, RangePicker, Ranked, short, Table, Td, Tile, useAdmin } from "@/components/admin/kit";
import { RANGES, type Insights } from "@/lib/admin";
import { languageName } from "@/lib/translate";

const EXPORT_LABEL: Record<string, string> = { "pdf-paperback": "Paperback PDF", "pdf-hardcover": "Hardcover PDF", epub: "EPUB ebook", docx: "Word file", typ: "Typst source", backup: "Backup file" };
const STATUS_LABEL: Record<string, string> = { idea: "Idea", drafting: "Drafting", revising: "Revising", editing: "Editing", ready: "Ready", published: "Published" };
const trimLabel = (t: string) => (/^\d/.test(t) ? `${t.replace("x", '" x ')}"` : t);

/** What's being written and done on the platform, from counts only. */
export default function InsightsPage() {
  const { range } = useAdmin();
  const [ins, setIns] = useState<Insights | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    call<{ insights: Insights }>(`/api/admin/insights?days=${range}`)
      .then((j) => {
        setIns(j.insights);
        setError("");
      })
      .catch((e: Error) => setError(e.message));
  }, [range]);
  const rl = RANGES.find((r) => r.days === range)?.label.toLowerCase() ?? "";
  const weekly = range === 0 || range > 90;

  return (
    <div className="grid gap-6">
      <PageHead title="Insights" sub="What's being written on Jollof Pages. Totals only; no manuscript, note or AI chat is ever read.">
        <RangePicker />
        {ins && (
          <CsvButton
            name="jollof-insights"
            rows={() => [...Object.entries(ins.totals).map(([k, v]) => ({ measure: k, value: v })), ...ins.words.map((w) => ({ measure: `words ${w.date}`, value: w.value }))]}
          />
        )}
      </PageHead>
      {error && <Problem text={error} />}
      {!ins ? (
        !error && <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <Tile label={`Words written, ${rl}`} value={short(ins.totals.wordsWritten)} sub={`${num(ins.totals.wordsWritten)} words`} tone="primary" />
            <Tile label="Words in all manuscripts" value={short(ins.totals.wordsOnPlatform)} sub={`${num(ins.totals.chapters)} chapters`} />
            <Tile label="Books" value={num(ins.totals.books)} sub={`${num(ins.totals.booksStarted)} started, ${rl}`} />
            <Tile label="Finished or published" value={num(ins.totals.booksFinished)} sub={`${num(ins.totals.booksPublished)} on author sites`} />
            <Tile label="Active writers" value={num(ins.totals.activeWriters7)} sub={`this week; ${num(ins.totals.activeWriters30)} in 30 days`} />
            <Tile label="Average book" value={short(ins.totals.avgBookWords)} sub={`words, about ${num(ins.totals.avgBookPages)} pages`} />
            <Tile label={`Exports, ${rl}`} value={num(ins.totals.exports)} sub="PDF, EPUB and Word" />
            <Tile label={`AI covers, ${rl}`} value={num(ins.totals.covers)} />
            <Tile label={`Translations, ${rl}`} value={num(ins.totals.translations)} sub="whole books into a new language" />
            <Tile label={`AI assistant answers, ${rl}`} value={num(ins.totals.aiAnswers)} sub="proofreading, ideas and edits" />
            <Tile label="Co-writers working" value={num(ins.totals.collaborations)} sub="accepted collaboration invites" />
            <Tile label="Comments left" value={num(ins.totals.comments)} sub="on shared books" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title={`Words written per ${weekly ? "week" : "day"}`} sub={`${num(ins.totals.wordsWritten)} words, ${rl}`}>
              <Columns data={ins.words} unit="words" weekly={weekly} />
            </Panel>
            <Panel title={`Sign-ups per ${weekly ? "week" : "day"}`} sub={`${num(ins.signups.reduce((s, b) => s + b.value, 0))} new accounts, ${rl}`}>
              <Columns data={ins.signups} unit="sign-ups" weekly={weekly} />
            </Panel>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Panel title="Where books are">
              <Ranked rows={ins.statuses} label={(k) => STATUS_LABEL[k] ?? k} />
            </Panel>
            <Panel title="Trim sizes">
              <Ranked rows={ins.trims} label={trimLabel} />
            </Panel>
            <Panel title="Languages">
              <Ranked rows={ins.languages} label={languageName} />
            </Panel>
            <Panel title="Top categories">
              <Ranked rows={ins.categories} empty="No categories picked yet." />
            </Panel>
            <Panel title={`Exports, ${rl}`}>
              <Ranked rows={ins.exportsBy} label={(k) => EXPORT_LABEL[k] ?? k} empty="No exports in this range." />
            </Panel>
            <Panel title={`Translations, ${rl}`}>
              <Ranked rows={ins.translationsBy} label={languageName} empty="No translations in this range." />
            </Panel>
            <Panel title="Longest writing streaks" sub="Days in a row with words written" className="md:col-span-2">
              {ins.streaks.length ? (
                <ol className="grid gap-1.5 text-sm">
                  {ins.streaks.map((s, i) => (
                    <li key={s.id} className="flex items-center gap-3">
                      <span className="w-5 text-soft tabular-nums">{i + 1}</span>
                      <span className="flex-1 truncate text-ink-2">{s.email}</span>
                      <span className="font-semibold text-ink tabular-nums">{s.days} days</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-soft">No streaks yet.</p>
              )}
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Have access, haven't written yet" sub="A good list for a friendly nudge email">
              <Table head={["Writer", "Plan", "Joined"]} min={420} empty={!ins.notStarted.length && "Everyone with access has started writing."}>
                {ins.notStarted.map((w) => (
                  <tr key={w.id} className="border-b border-border last:border-0">
                    <Td>
                      <a href={`mailto:${w.email}`} className="hover:text-primary">
                        {w.email}
                      </a>
                    </Td>
                    <Td>{w.access === "paid" ? "Paid" : "Free access"}</Td>
                    <Td>{date(w.created)}</Td>
                  </tr>
                ))}
              </Table>
            </Panel>
            <Panel title="Gone quiet" sub="Wrote before, nothing in the last 30 days">
              <Table head={["Writer", { label: "Words written", right: true }, "Last wrote"]} min={420} empty={!ins.quiet.length && "Nobody has gone quiet."}>
                {ins.quiet.map((w) => (
                  <tr key={w.id} className="border-b border-border last:border-0">
                    <Td>
                      <a href={`mailto:${w.email}`} className="hover:text-primary">
                        {w.email}
                      </a>
                    </Td>
                    <Td right>{num(w.words)}</Td>
                    <Td>{ago(w.lastWrote)}</Td>
                  </tr>
                ))}
              </Table>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
