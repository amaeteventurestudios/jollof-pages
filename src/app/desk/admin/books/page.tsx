"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ago, call, CsvButton, Loading, num, PageHead, Pill, Problem, Table, Td, Tile, TONES } from "@/components/admin/kit";
import type { BookRow } from "@/lib/admin";
import { languageName } from "@/lib/translate";
import { cn } from "@/lib/utils";

const STATUS: Record<string, string> = { idea: "Idea", drafting: "Drafting", revising: "Revising", editing: "Editing", ready: "Ready", published: "Published" };

/** Every book on the platform by title and numbers. The admin never opens what's inside. */
export default function BooksPage() {
  const [books, setBooks] = useState<BookRow[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  useEffect(() => {
    call<{ books: BookRow[] }>("/api/admin/books")
      .then((j) => setBooks(j.books))
      .catch((e: Error) => setError(e.message));
  }, []);
  if (error) return <Problem text={error} />;
  if (!books) return <Loading what="Loading books" />;
  const needle = q.trim().toLowerCase();
  const shown = books.filter((b) => (status === "all" || (status === "live" ? b.published : b.status === status)) && (!needle || `${b.title} ${b.email}`.toLowerCase().includes(needle)));
  const words = books.reduce((s, b) => s + b.words, 0);

  return (
    <div className="grid gap-5">
      <PageHead title="Books" sub="Titles, sizes and where each book is. Nobody's manuscript is opened here.">
        <CsvButton
          name="jollof-books"
          rows={() =>
            shown.map((b) => ({
              title: b.title,
              writer: b.email,
              status: STATUS[b.status] ?? b.status,
              on_site: b.published ? "yes" : "",
              language: languageName(b.language),
              trim: b.trim,
              words: b.words,
              pages: b.pages,
              started: b.created,
              updated: b.updated,
            }))
          }
        />
      </PageHead>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Books" value={num(books.length)} />
        <Tile label="Words in them" value={num(words)} />
        <Tile label="On author sites" value={num(books.filter((b) => b.published).length)} />
        <Tile label="Ready or published" value={num(books.filter((b) => b.status === "ready" || b.status === "published").length)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-soft" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title or writer" aria-label="Search books" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Status">
          {["all", "live", ...Object.keys(STATUS)].map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              onClick={() => setStatus(s)}
              className={cn("h-9 border px-3 text-[13px]", status === s ? "border-ink bg-ink text-card" : "border-border bg-card text-ink-2 hover:border-primary")}
            >
              {s === "all" ? "All" : s === "live" ? "On a site" : STATUS[s]}
            </button>
          ))}
        </div>
      </div>
      <Table head={["Book", "Writer", "Status", "Language", "Trim", { label: "Words", right: true }, { label: "Pages", right: true }, "Updated"]} min={900} empty={!shown.length && "No books match."}>
        {shown.slice(0, 500).map((b) => (
          <tr key={b.id} className="border-b border-border last:border-0">
            <Td className="max-w-xs">
              <p className="truncate font-medium text-ink">{b.title}</p>
            </Td>
            <Td className="text-ink-2">{b.email}</Td>
            <Td>
              <span className="flex gap-1">
                <Pill cls={b.status === "published" || b.status === "ready" ? TONES.good : TONES.quiet}>{STATUS[b.status] ?? b.status}</Pill>
                {b.published && <Pill cls={TONES.brand}>On site</Pill>}
              </span>
            </Td>
            <Td>{languageName(b.language)}</Td>
            <Td>{b.trim ? b.trim.replace("x", " x ") : "—"}</Td>
            <Td right>{num(b.words)}</Td>
            <Td right>{b.pages || "—"}</Td>
            <Td className="whitespace-nowrap">{ago(b.updated)}</Td>
          </tr>
        ))}
      </Table>
      {shown.length > 500 && <p className="text-[13px] text-soft">Showing the 500 most recently updated. Download the CSV for all {num(shown.length)}.</p>}
    </div>
  );
}
