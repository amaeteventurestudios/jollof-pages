"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Lightbulb } from "lucide-react";
import { ago, call, Loading, num, PageHead, Pill, Problem, Table, Td, Tile, TONES } from "@/components/admin/kit";
import { IDEA_STATUSES, type Idea, type IdeaStatus } from "@/lib/support";
import { cn } from "@/lib/utils";

type Show = "all" | IdeaStatus;
const label = (s: IdeaStatus) => IDEA_STATUSES.find((x) => x.id === s)?.label ?? s;

/** The feature requests writers and testers vote on. Responding happens on the ideas board. */
export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [error, setError] = useState("");
  const [show, setShow] = useState<Show>("all");
  useEffect(() => {
    call<{ ideas: Idea[] }>("/api/ideas")
      .then((j) => setIdeas(j.ideas))
      .catch((e: Error) => setError(e.message));
  }, []);
  if (error) return <Problem text={error} />;
  if (!ideas) return <Loading what="Loading feature requests" />;
  const count = (s: Show) => (s === "all" ? ideas.length : ideas.filter((i) => i.status === s).length);
  const shown = ideas.filter((i) => show === "all" || i.status === show).sort((a, b) => b.votes - a.votes);

  return (
    <div className="grid gap-5">
      <PageHead title="Feature requests" sub="What writers and testers want next, most votes first.">
        <Link href="/desk/ideas" className="inline-flex h-9 items-center gap-1.5 border border-primary bg-primary px-3 text-sm text-primary-foreground hover:bg-primary/90">
          <Lightbulb className="size-4" /> Open the board to respond <ArrowRight className="size-4" />
        </Link>
      </PageHead>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Waiting for review" value={num(count("new"))} tone={count("new") ? "primary" : undefined} />
        <Tile label="Planned or in progress" value={num(count("planned") + count("in_progress"))} />
        <Tile label="Shipped" value={num(count("shipped"))} />
        <Tile label="Votes cast" value={num(ideas.reduce((s, i) => s + i.votes, 0))} sub={`on ${num(ideas.length)} ideas`} />
      </div>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Show">
        {(["all", ...IDEA_STATUSES.map((s) => s.id)] as Show[]).map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={show === s}
            onClick={() => setShow(s)}
            className={cn("h-9 border px-3 text-[13px]", show === s ? "border-ink bg-ink text-card" : "border-border bg-card text-ink-2 hover:border-primary")}
          >
            {s === "all" ? "All" : label(s)} <span className="opacity-60 tabular-nums">{count(s)}</span>
          </button>
        ))}
      </div>
      <Table head={[{ label: "Votes", right: true }, "Idea", "Suggested", "Status"]} min={640} empty={!shown.length && "No feature requests here."}>
        {shown.map((i) => (
          <tr key={i.id} className="border-b border-border align-top last:border-0">
            <Td className="text-right text-base font-semibold text-ink tabular-nums">{i.votes}</Td>
            <Td>
              <p className="font-medium text-ink">{i.title}</p>
              {i.details && <p className="mt-0.5 line-clamp-2 text-[13px] text-soft">{i.details}</p>}
            </Td>
            <Td className="whitespace-nowrap">{ago(i.created)}</Td>
            <Td>
              <Pill cls={i.status === "new" ? TONES.brand : TONES.quiet}>{label(i.status)}</Pill>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
