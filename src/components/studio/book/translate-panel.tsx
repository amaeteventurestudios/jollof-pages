"use client";

import { useState } from "react";
import Link from "next/link";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANGUAGES, languageName } from "@/lib/translate";
import { startTranslation, useTranslateJob } from "@/lib/translate-job";
import { Panel } from "./details-tab";
import type { Workspace } from "./workspace";

/**
 * "Translate this book": makes a new book, the same book in another language, with every chapter
 * translated by the writer's own AI model. The original is never touched. Covers redraw the
 * translated title by themselves; artwork with lettering baked in needs new artwork.
 */
export function TranslatePanel({ ws }: { ws: Workspace }) {
  const { book } = ws;
  const [lang, setLang] = useState(book.language === "es" ? "pt" : "es");
  const job = useTranslateJob();
  const mine = job && job.fromId === book.id ? job : null;
  const busy = Boolean(job?.busy);
  const step = mine?.step ?? null;
  const error = mine?.error ?? null;
  const made = mine?.made ?? null;
  const doneLang = mine?.lang ?? lang;
  const words = ws.chapters.reduce((s, c) => s + (c.word_count || 0), 0);

  function run() {
    void startTranslation(book, ws.chapters, lang);
  }

  return (
    <Panel
      title="Translate this book"
      description="Make the same book in another language, chapter by chapter, with your own AI model. Your original stays exactly as it is; the translation becomes a new book you can edit, format and publish. It shows up in Your books with its language on it, and you can show your books one language at a time."
    >
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">Into</span>
          <select value={lang} onChange={(e) => setLang(e.target.value)} disabled={busy} className="h-10 min-w-56 border border-input bg-card px-2">
            {LANGUAGES.filter((l) => l.code !== book.language).map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" onClick={run} disabled={busy || !ws.chapters.length}>
          {busy ? <Loader2 className="animate-spin" /> : <Languages />} {busy ? "Translating…" : `Make a ${languageName(lang)} edition`}
        </Button>
      </div>
      <p className="text-[13px] text-soft">
        About {words.toLocaleString()} words. Your AI provider bills you for it; a whole book usually costs a few dollars or less. No need to wait here: carry on anywhere in the Desk and a little card in the corner shows the progress. Just keep this browser tab open.
      </p>
      {step && busy && (
        <div className="grid gap-1.5" role="status">
          <div className="h-2 w-full bg-paper-2">
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.round((step.done / step.total) * 100)}%` }} />
          </div>
          <p className="text-sm text-ink-2">
            {step.done} of {step.total}: {step.label}
          </p>
        </div>
      )}
      {made && (
        <p className="border border-primary/40 bg-primary-soft p-3 text-sm" role="status">
          Done. <strong>{made.title}</strong> is your {languageName(doneLang)} edition, and it is in Your books under {languageName(doneLang)}.{" "}
          <Link href={`/desk/books/${made.id}`} className="font-medium text-primary underline">
            Open it
          </Link>{" "}
          to read it through, then make its cover on the Cover tab. If your cover art has the old title painted on, make new artwork with AI in the new language.
        </p>
      )}
      {error && (
        <p className="bg-danger-soft p-3 text-sm text-destructive" role="alert">
          {error.text}{" "}
          {error.setup && (
            <Link href="/desk/assistant" className="font-medium underline">
              Set up the AI assistant
            </Link>
          )}
        </p>
      )}
    </Panel>
  );
}
