"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { WriteTab } from "@/components/studio/book/write-tab";
import { DetailsTab } from "@/components/studio/book/details-tab";
import { FormatTab } from "@/components/studio/book/format-tab";
import { GoalsTab } from "@/components/studio/book/goals-tab";
import { PublishTab } from "@/components/studio/book/publish-tab";
import { ExportTab } from "@/components/studio/book/export-tab";
import { loadBook, updateBook } from "@/lib/studio";
import { errorMessage } from "@/lib/pb";
import type { Book, Chapter } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/components/studio/book/workspace";

const CoverTab = dynamic(() => import("@/components/studio/book/cover-tab").then((m) => m.CoverTab), {
  ssr: false,
  loading: () => <p className="p-8 text-soft">Loading the cover designer…</p>,
});

const TABS = [
  { id: "write", label: "Write" },
  { id: "details", label: "Book details" },
  { id: "format", label: "Format" },
  { id: "cover", label: "Cover" },
  { id: "goals", label: "Goals" },
  { id: "publish", label: "Publish" },
  { id: "export", label: "Export" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function BookWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const tab = (TABS.find((t) => t.id === params.get("tab"))?.id ?? "write") as TabId;
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const pending = useRef(0);

  useEffect(() => {
    loadBook(id)
      .then(({ book, chapters }) => {
        setBook(book);
        setChapters(chapters);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  const track = useCallback(async <T,>(p: Promise<T>): Promise<T> => {
    pending.current++;
    setSaving("saving");
    try {
      const r = await p;
      pending.current--;
      if (!pending.current) setSaving("saved");
      return r;
    } catch (e) {
      pending.current--;
      setSaving("error");
      throw e;
    }
  }, []);

  const saveBook = useCallback(
    async (patch: Partial<Book>) => {
      setBook((b) => (b ? { ...b, ...patch } : b));
      const updated = await track(updateBook(id, patch));
      setBook((b) => (b ? { ...b, ...updated, expand: updated.expand ?? b.expand } : updated));
      return updated;
    },
    [id, track],
  );

  if (error)
    return (
      <main className="mx-auto max-w-xl p-10">
        <p className="text-destructive">This book could not be opened: {error}</p>
        <Link href="/studio" className="mt-4 inline-block text-primary underline">
          Back to your books
        </Link>
      </main>
    );
  if (!book)
    return (
      <p className="p-10 text-soft" role="status">
        Opening book…
      </p>
    );

  const ws: Workspace = { book, chapters, setChapters, saveBook, setBook, track };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-border bg-card px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 py-2">
          <Link href="/studio" aria-label="All books" className="rounded p-1.5 text-ink-2 hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <span className="truncate font-medium">{book.title}</span>
          <span className="text-sm whitespace-nowrap text-soft" role="status" aria-live="polite">
            {saving === "saving" ? "Saving…" : saving === "saved" ? "All changes saved" : saving === "error" ? "Not saved, check your connection" : ""}
          </span>
        </div>
        <nav className="order-last -mb-px flex w-full gap-1 overflow-x-auto md:order-none md:ml-auto md:w-auto" aria-label="Book">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => router.replace(`/studio/books/${id}${t.id === "write" ? "" : `?tab=${t.id}`}`, { scroll: false })}
              className={cn(
                "h-11 border-b-2 border-transparent px-3 text-sm whitespace-nowrap text-ink-2 hover:text-ink",
                tab === t.id && "border-primary font-medium text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <Link href="/studio/help" target="_blank" aria-label="Help and support" title="Help and support" className="-ml-2 rounded p-1.5 text-ink-2 hover:bg-muted max-md:absolute max-md:top-2 max-md:right-3">
          <LifeBuoy className="size-4" />
        </Link>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "write" && <WriteTab ws={ws} />}
        {tab !== "write" && (
          <div className="min-h-0 flex-1 overflow-y-auto bg-background">
            {tab === "details" && <DetailsTab ws={ws} />}
            {tab === "format" && <FormatTab ws={ws} />}
            {tab === "cover" && <CoverTab ws={ws} />}
            {tab === "goals" && <GoalsTab ws={ws} />}
            {tab === "publish" && <PublishTab ws={ws} />}
            {tab === "export" && <ExportTab ws={ws} />}
          </div>
        )}
      </div>
    </div>
  );
}
