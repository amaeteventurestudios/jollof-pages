"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Inbox, Lightbulb } from "lucide-react";
import { ago, call, Loading, num, PageHead, Panel, Pill, Problem, Tile, TONES } from "@/components/admin/kit";
import { IDEA_STATUSES, ticketNo, topicLabel, type Idea, type SupportRequest } from "@/lib/support";

const TICKET: Record<SupportRequest["status"], { label: string; cls: string }> = {
  open: { label: "Waiting for you", cls: TONES.bad },
  answered: { label: "Answered", cls: TONES.warn },
  closed: { label: "Closed", cls: TONES.quiet },
};

/** Tickets and the ideas board side by side. Answering happens in the support inbox and on the board. */
export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportRequest[] | null>(null);
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    call<{ requests: SupportRequest[] }>("/api/support")
      .then((j) => setTickets(j.requests))
      .catch((e: Error) => setError(e.message));
    call<{ ideas: Idea[] }>("/api/ideas")
      .then((j) => setIdeas(j.ideas))
      .catch((e: Error) => setError(e.message));
  }, []);
  if (error) return <Problem text={error} />;
  if (!tickets || !ideas) return <Loading what="Loading tickets and ideas" />;
  const open = tickets.filter((t) => t.status === "open");
  const byVotes = [...ideas].sort((a, b) => b.votes - a.votes);

  return (
    <div className="grid gap-5">
      <PageHead title="Support" sub="Help tickets from writers and testers, and the ideas they vote on." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Waiting for you" value={num(open.length)} tone={open.length ? "primary" : undefined} />
        <Tile label="Answered, waiting on the writer" value={num(tickets.filter((t) => t.status === "answered").length)} />
        <Tile label="New ideas" value={num(ideas.filter((i) => i.status === "new").length)} />
        <Tile label="Votes cast" value={num(ideas.reduce((s, i) => s + i.votes, 0))} sub={`on ${num(ideas.length)} ideas`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Tickets"
          sub="Newest activity first"
          action={
            <Link href="/studio/help#inbox" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Inbox className="size-4" /> Open the inbox to reply <ArrowRight className="size-4" />
            </Link>
          }
        >
          {tickets.length ? (
            <ul className="divide-y divide-border">
              {tickets.slice(0, 30).map((t) => (
                <li key={t.id} className="flex items-start gap-3 py-2.5">
                  <span className="w-12 shrink-0 text-[13px] text-soft tabular-nums">{ticketNo(t)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{t.subject}</p>
                    <p className="truncate text-[12.5px] text-soft">
                      {t.email} · {topicLabel(t.topic)} · {ago(t.updated)}
                    </p>
                  </div>
                  <Pill cls={TICKET[t.status].cls}>{TICKET[t.status].label}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-soft">No tickets yet.</p>
          )}
        </Panel>
        <Panel
          title="Ideas board"
          sub="Most votes first"
          action={
            <Link href="/studio/ideas" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <Lightbulb className="size-4" /> Open the board to respond <ArrowRight className="size-4" />
            </Link>
          }
        >
          {byVotes.length ? (
            <ul className="divide-y divide-border">
              {byVotes.slice(0, 30).map((i) => (
                <li key={i.id} className="flex items-start gap-3 py-2.5">
                  <span className="w-10 shrink-0 text-right font-semibold text-ink tabular-nums">{i.votes}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{i.title}</p>
                    <p className="text-[12.5px] text-soft">{ago(i.created)}</p>
                  </div>
                  <Pill cls={i.status === "new" ? TONES.brand : TONES.quiet}>{IDEA_STATUSES.find((x) => x.id === i.status)?.label ?? i.status}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-soft">No ideas yet.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
