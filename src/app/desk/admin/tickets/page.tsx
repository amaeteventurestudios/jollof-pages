"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Inbox } from "lucide-react";
import { ago, call, Loading, num, PageHead, Pill, Problem, Table, Td, Tile, TONES } from "@/components/admin/kit";
import { ticketNo, topicLabel, type SupportRequest } from "@/lib/support";
import { cn } from "@/lib/utils";

const STATUS: Record<SupportRequest["status"], { label: string; cls: string }> = {
  open: { label: "Waiting for you", cls: TONES.bad },
  answered: { label: "Answered", cls: TONES.warn },
  closed: { label: "Closed", cls: TONES.quiet },
};
type Show = "all" | SupportRequest["status"];
const SHOWS: Show[] = ["open", "answered", "closed", "all"];

/** Help tickets from writers and testers. Replying happens in the support inbox. */
export default function TicketsPage() {
  const [tickets, setTickets] = useState<SupportRequest[] | null>(null);
  const [error, setError] = useState("");
  const [show, setShow] = useState<Show>("open");
  useEffect(() => {
    call<{ requests: SupportRequest[] }>("/api/support")
      .then((j) => {
        setTickets(j.requests);
        if (!j.requests.some((t) => t.status === "open")) setShow("all");
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  if (error) return <Problem text={error} />;
  if (!tickets) return <Loading what="Loading tickets" />;
  const count = (s: Show) => (s === "all" ? tickets.length : tickets.filter((t) => t.status === s).length);
  const shown = tickets.filter((t) => show === "all" || t.status === show);

  return (
    <div className="grid gap-5">
      <PageHead title="Tickets" sub="Help requests from writers and testers, newest activity first.">
        <Link href="/desk/help#inbox" className="inline-flex h-9 items-center gap-1.5 border border-primary bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90">
          <Inbox className="size-4" /> Open the inbox to reply <ArrowRight className="size-4" />
        </Link>
      </PageHead>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Waiting for you" value={num(count("open"))} tone={count("open") ? "primary" : undefined} />
        <Tile label="Answered, waiting on the writer" value={num(count("answered"))} />
        <Tile label="Closed" value={num(count("closed"))} />
        <Tile label="All tickets" value={num(tickets.length)} />
      </div>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Show">
        {SHOWS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={show === s}
            onClick={() => setShow(s)}
            className={cn("h-9 border px-3 text-[13px]", show === s ? "border-ink bg-ink text-card" : "border-border bg-card text-ink-2 hover:border-primary")}
          >
            {s === "all" ? "All" : STATUS[s].label} <span className="opacity-60 tabular-nums">{count(s)}</span>
          </button>
        ))}
      </div>
      <Table head={["Ticket", "Subject", "From", "Topic", "Last activity", "Status"]} empty={!shown.length && "No tickets here."}>
        {shown.map((t) => (
          <tr key={t.id} className="border-b border-border last:border-0">
            <Td className="text-soft tabular-nums">{ticketNo(t)}</Td>
            <Td className="font-medium text-ink">{t.subject}</Td>
            <Td>{t.email}</Td>
            <Td>{topicLabel(t.topic)}</Td>
            <Td className="whitespace-nowrap">{ago(t.updated)}</Td>
            <Td>
              <Pill cls={STATUS[t.status].cls}>{STATUS[t.status].label}</Pill>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
