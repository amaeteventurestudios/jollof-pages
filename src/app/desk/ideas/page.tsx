"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronUp, Lightbulb, Loader2, Trash2 } from "lucide-react";
import { StudioNav } from "@/components/studio/studio-nav";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { pb } from "@/lib/pb";
import { IDEA_STATUSES, type Idea, type IdeaStatus } from "@/lib/support";
import { cn } from "@/lib/utils";

const auth = () => ({ Authorization: `Bearer ${pb().authStore.token}`, "Content-Type": "application/json" });

const BADGE: Record<IdeaStatus, string> = {
  new: "bg-paper-2 text-ink-2",
  planned: "bg-[#e3ecfa] text-[#1d4f91]",
  in_progress: "bg-[#fbecd0] text-[#7a4b06]",
  shipped: "bg-primary-soft text-primary",
  declined: "bg-paper-2 text-soft",
};
const label = (s: IdeaStatus) => IDEA_STATUSES.find((x) => x.id === s)?.label ?? s;

type Filter = "top" | "recent" | IdeaStatus;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "top", label: "Most wanted" },
  { id: "recent", label: "Newest" },
  { id: "planned", label: "Planned" },
  { id: "in_progress", label: "In progress" },
  { id: "shipped", label: "Shipped" },
];

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: auth(), body: JSON.stringify(body) });
  const j = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(j.error || "Something went wrong.");
  return j;
}

/** Feature requests: writers suggest what to build next and vote; the team says where each stands. */
export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [team, setTeam] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("top");

  const load = useCallback(() => {
    fetch("/api/ideas", { headers: auth() })
      .then(async (res) => {
        const j = (await res.json()) as { team?: boolean; ideas?: Idea[]; error?: string };
        if (!res.ok) throw new Error(j.error || "Could not load ideas.");
        setTeam(!!j.team);
        setIdeas(j.ideas ?? []);
      })
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const replace = (idea: Idea) => setIdeas((all) => (all ?? []).map((i) => (i.id === idea.id ? idea : i)));
  const shown = (ideas ?? [])
    .filter((i) => (filter === "top" || filter === "recent" ? i.status !== "declined" && i.status !== "shipped" : i.status === filter))
    .sort((a, b) => (filter === "recent" ? b.created.localeCompare(a.created) : b.votes - a.votes || b.created.localeCompare(a.created)));

  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10">
        <p className="flex items-center gap-2 text-sm font-medium tracking-[0.12em] text-primary uppercase">
          <Lightbulb className="size-4" /> Feature requests
        </p>
        <h1 className="mt-2 text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-[-0.02em]">What should we build next?</h1>
        <p className="mt-1 max-w-2xl text-soft">Suggest an idea or vote for the ones you want. The most wanted rise to the top, and you can see what is planned, being built and shipped.</p>

        <NewIdea onAdded={(i) => setIdeas((all) => [i, ...(all ?? [])])} />

        <div role="tablist" aria-label="Show" className="mt-10 flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn("h-9 border px-3 text-sm", filter === f.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary")}
            >
              {f.label}
              {f.id !== "top" && f.id !== "recent" && ideas ? ` (${ideas.filter((i) => i.status === f.id).length})` : ""}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-4 bg-danger-soft p-3 text-sm text-destructive">{error}</p>
        ) : !ideas ? (
          <p className="mt-4 text-soft">Loading…</p>
        ) : !shown.length ? (
          <p className="mt-4 text-soft">{filter === "top" || filter === "recent" ? "No ideas yet. Be the first to suggest one." : "Nothing here yet."}</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {shown.map((i) => (
              <IdeaCard key={i.id} idea={i} team={team} onChange={replace} onRemove={() => setIdeas((all) => (all ?? []).filter((x) => x.id !== i.id))} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function NewIdea({ onAdded }: { onAdded: (i: Idea) => void }) {
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <form
      className="mt-8 grid gap-3 border border-border bg-card p-5 sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg("");
        try {
          const { idea } = await post<{ idea: Idea }>("/api/ideas", { title, details });
          onAdded(idea);
          setTitle("");
          setDetails("");
          setMsg("Thanks! Your idea is on the board with your vote.");
        } catch (err) {
          setMsg((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-lg font-medium">Suggest a feature</h2>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required placeholder="In a few words, e.g. Export to Apple Books" aria-label="Idea title" />
      <Textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        maxLength={4000}
        rows={3}
        placeholder="What would it let you do, and why does it matter to you? (optional)"
        aria-label="Details"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || title.trim().length < 4}>
          {busy ? <Loader2 className="animate-spin" /> : <Lightbulb />} Post idea
        </Button>
        <span className="text-sm text-soft" role="status">
          {msg}
        </span>
      </div>
    </form>
  );
}

function IdeaCard({ idea, team, onChange, onRemove }: { idea: Idea; team: boolean; onChange: (i: Idea) => void; onRemove: () => void }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(idea.response);
  const [err, setErr] = useState("");
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <li className="flex gap-4 border border-border bg-card p-4 sm:p-5">
      <button
        type="button"
        disabled={busy}
        aria-pressed={idea.voted}
        aria-label={idea.voted ? `Remove your vote (${idea.votes})` : `Vote for this (${idea.votes})`}
        title={idea.voted ? "Remove your vote" : "Vote for this"}
        onClick={() => run(async () => onChange((await post<{ idea: Idea }>("/api/ideas/vote", { id: idea.id })).idea))}
        className={cn(
          "flex h-16 w-14 shrink-0 flex-col items-center justify-center border text-sm font-semibold tabular-nums transition",
          idea.voted ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-ink hover:border-primary hover:text-primary",
        )}
      >
        <ChevronUp className="size-5" />
        {idea.votes}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{idea.title}</h3>
          <span className={cn("px-2 py-0.5 text-xs font-medium", BADGE[idea.status])}>{label(idea.status)}</span>
          {idea.mine && <span className="text-xs text-soft">Your idea</span>}
        </div>
        {idea.details && <p className="mt-1 whitespace-pre-wrap text-ink-2">{idea.details}</p>}
        {idea.response && !team && (
          <p className="mt-3 border-l-2 border-primary bg-paper px-3 py-2 text-sm">
            <span className="font-medium">Jollof Pages: </span>
            {idea.response}
          </p>
        )}
        {team && (
          <div className="mt-3 grid gap-2 border-t border-border pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Status"
                value={idea.status}
                disabled={busy}
                onChange={(e) => run(async () => onChange((await post<{ idea: Idea }>("/api/ideas/update", { id: idea.id, status: e.target.value })).idea))}
                className="h-8 border border-input bg-card px-2 text-sm"
              >
                {IDEA_STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={busy}
                onClick={() => confirm("Remove this idea for everyone?") && run(async () => (await post("/api/ideas/update", { id: idea.id, remove: true }), onRemove()))}
              >
                <Trash2 /> Remove
              </Button>
            </div>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000} placeholder="A note everyone sees, e.g. what shipped or why not" aria-label="Note to writers" />
            {note !== idea.response && (
              <Button
                size="sm"
                variant="outline"
                className="w-fit"
                disabled={busy}
                onClick={() => run(async () => onChange((await post<{ idea: Idea }>("/api/ideas/update", { id: idea.id, response: note })).idea))}
              >
                Save note
              </Button>
            )}
          </div>
        )}
        {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      </div>
    </li>
  );
}
