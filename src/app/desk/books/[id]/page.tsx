"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { AccountMenu } from "@/components/studio/studio-nav";
import { AccountButton, MorePage } from "@/components/app/app-chrome";
import { isCollaboratorOnly } from "@/components/studio/auth-gate";
import { ThemeToggle } from "@/components/theme-toggle";
import { WriteTab } from "@/components/studio/book/write-tab";
import { DetailsTab } from "@/components/studio/book/details-tab";
import { FormatTab } from "@/components/studio/book/format-tab";
import { GoalsTab } from "@/components/studio/book/goals-tab";
import { PublishTab } from "@/components/studio/book/publish-tab";
import { ExportTab } from "@/components/studio/book/export-tab";
import { loadBook, updateBook } from "@/lib/studio";
import { isShared, roleOf } from "@/lib/collab";
import { pb } from "@/lib/pb";
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
  { id: "details", label: "Book details", short: "Details" },
  { id: "format", label: "Format" },
  { id: "cover", label: "Cover" },
  { id: "goals", label: "Goals" },
  { id: "publish", label: "Publish" },
  { id: "export", label: "Export" },
] as { id: string; label: string; short?: string }[];
type TabId = "write" | "details" | "format" | "cover" | "goals" | "publish" | "export";

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
  const [more, setMore] = useState(false);

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
        <Link href="/desk" className="mt-4 inline-block text-primary underline">
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

  const role = roleOf(book, pb().authStore.record?.id) ?? "commenter";
  const ws: Workspace = { book, chapters, setChapters, saveBook, setBook, track, role, live: isShared(book) };
  // people the book is shared with work in the manuscript; the rest of the book is the owner's
  const tabs = role === "owner" ? TABS : TABS.filter((t) => t.id === "write");

  const status = saving === "saving" ? "Saving…" : saving === "saved" ? "All changes saved" : saving === "error" ? "Not saved, check your connection" : "";

  return (
    <div className="flex h-dvh flex-col">
      {/* phones and tablets: an app bar with a back button, the book's title and its save state */}
      <header className="app-bar hidden shrink-0 bg-[var(--app-bar)] pt-[env(safe-area-inset-top)] text-[var(--app-bar-ink)] app:block">
        <div className="flex h-14 items-center gap-1 pr-2 pl-[max(0.25rem,env(safe-area-inset-left))]">
          <Link href="/desk" aria-label="All books" className="grid size-11 shrink-0 place-items-center active:opacity-70">
            <ChevronLeft className="size-7" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] leading-tight font-semibold tracking-tight">{book.title}</p>
            <p className="truncate text-[12px] leading-tight opacity-80" role="status" aria-live="polite">
              {status || `${(book.word_count || 0).toLocaleString()} words`}
            </p>
          </div>
          <AccountButton onClick={() => setMore(true)} />
          <MorePage open={more} onOpenChange={setMore} guest={isCollaboratorOnly()} />
        </div>
        {tabs.length > 1 && (
          <nav
            ref={(nav) => nav?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" })}
            className="flex overflow-x-auto bg-card text-ink [scrollbar-width:none]"
            aria-label="Book"
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-current={tab === t.id ? "page" : undefined}
                onClick={() => router.replace(`/desk/books/${id}${t.id === "write" ? "" : `?tab=${t.id}`}`, { scroll: false })}
                className={cn(
                  "relative h-12 shrink-0 grow px-4 text-[15px] whitespace-nowrap text-soft",
                  tab === t.id && "font-semibold text-primary after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-primary",
                )}
              >
                {t.short ?? t.label}
              </button>
            ))}
          </nav>
        )}
      </header>
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-border bg-card px-3 sm:px-4 app:hidden">
        <div className="flex min-w-0 items-center gap-2 py-2">
          <Link href="/desk" aria-label="All books" className="rounded p-1.5 text-ink-2 hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <span className="truncate font-medium">{book.title}</span>
          <span className="text-sm whitespace-nowrap text-soft" role="status" aria-live="polite">
            {status}
          </span>
        </div>
        <nav className={cn("order-last -mb-px grid w-full md:order-none md:ml-auto md:flex md:w-auto md:gap-1", tabs.length > 1 ? "grid-cols-7" : "grid-cols-1")} aria-label="Book">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => router.replace(`/desk/books/${id}${t.id === "write" ? "" : `?tab=${t.id}`}`, { scroll: false })}
              className={cn(
                "h-11 truncate border-b-2 border-transparent px-1 text-[13px] whitespace-nowrap text-ink-2 hover:text-ink md:px-3 md:text-sm",
                tab === t.id && "border-primary font-medium text-ink",
              )}
            >
              <span className="md:hidden">{t.short ?? t.label}</span>
              <span className="max-md:hidden">{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-1 max-md:ml-auto">
          <ThemeToggle className="size-9 justify-center rounded text-ink-2 hover:bg-muted [&_svg]:size-[18px]" />
          <AccountMenu />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">
        {(tab === "write" || role !== "owner") && <WriteTab ws={ws} />}
        {tab !== "write" && role === "owner" && (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background app:pb-[env(safe-area-inset-bottom)]">
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
