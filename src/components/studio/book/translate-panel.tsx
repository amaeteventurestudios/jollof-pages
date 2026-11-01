"use client";

import { useState } from "react";
import Link from "next/link";
import { Languages, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pb } from "@/lib/pb";
import { sortChapters } from "@/lib/book-model";
import { countWords, type DocNode } from "@/lib/doc/types";
import { withoutSuggestions } from "@/lib/doc/suggestions";
import { LANGUAGES, languageName, planTranslation } from "@/lib/translate";
import { slugify } from "@/lib/slug";
import { trackUsage } from "@/lib/usage";
import { uniqueSlug, userId } from "@/lib/studio";
import type { Book, Chapter } from "@/lib/types";
import { Panel } from "./details-tab";
import type { Workspace } from "./workspace";

async function translate(bookId: string, language: string, strings: string[]): Promise<string[]> {
  if (!strings.length) return [];
  const res = await fetch("/api/assistant/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${pb().authStore.token}` },
    body: JSON.stringify({ bookId, language, strings }),
  });
  const j = (await res.json().catch(() => ({}))) as { strings?: string[]; error?: string; setup?: boolean };
  if (!res.ok || !j.strings) throw Object.assign(new Error(j.error || `Translation failed (${res.status}).`), { setup: j.setup });
  return j.strings;
}

/** Fields that carry over to the translated edition unchanged. */
const KEEP = ["author", "series", "series_number", "categories", "imprint", "cover_design", "format", "goal", "accent"] as const;

/**
 * "Translate this book": makes a new book, the same book in another language, with every chapter
 * translated by the writer's own AI model. The original is never touched. Covers redraw the
 * translated title by themselves; artwork with lettering baked in needs new artwork.
 */
export function TranslatePanel({ ws }: { ws: Workspace }) {
  const { book } = ws;
  const [lang, setLang] = useState(book.language === "es" ? "pt" : "es");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<{ done: number; total: number; label: string } | null>(null);
  const [error, setError] = useState<{ text: string; setup?: boolean } | null>(null);
  const [made, setMade] = useState<{ id: string; title: string } | null>(null);
  const words = ws.chapters.reduce((s, c) => s + (c.word_count || 0), 0);

  async function run() {
    setBusy(true);
    setError(null);
    setMade(null);
    const name = languageName(lang);
    try {
      const chapters = sortChapters(ws.chapters);
      const total = chapters.length + 1;
      setStep({ done: 0, total, label: "The title and description" });
      const meta = [book.title, book.subtitle, book.description, book.pitch, ...(book.keywords ?? [])];
      const keep = meta.map((s) => Boolean(s && s.trim()));
      const sent = meta.filter((_, i) => keep[i]) as string[];
      const got = await translate(book.id, lang, sent);
      let k = 0;
      const t = meta.map((s, i) => (keep[i] ? got[k++] : s));
      const [title, subtitle, description, pitch, ...keywords] = t;

      const copy: Record<string, unknown> = {
        owner: userId(),
        title: title || book.title,
        subtitle: subtitle ?? "",
        description: description ?? "",
        pitch: pitch ?? "",
        keywords: keywords.length ? keywords : null,
        language: lang,
        status: "drafting",
        published: false,
      };
      for (const f of KEEP) copy[f] = book[f];
      copy.slug = await uniqueSlug("books", slugify(`${book.slug}-${lang}`));
      const created = await pb()
        .collection("books")
        .create<Book>(copy)
        .catch(async () =>
          pb()
            .collection("books")
            .create<Book>({ ...copy, slug: `${copy.slug}-${Date.now().toString(36)}` }),
        );

      for (let i = 0; i < chapters.length; i++) {
        const c = chapters[i];
        setStep({ done: i + 1, total, label: c.title || c.kind });
        const doc = withoutSuggestions(c.content ?? null);
        const job = doc ? planTranslation(doc) : null;
        // the chapter title and subtitle travel with the first batch
        const heads = [c.title, c.subtitle].map((s) => s || "");
        const answers: string[][] = [];
        let newHeads = heads;
        const batches = job?.batches.length ? job.batches : [[]];
        for (let b = 0; b < batches.length; b++) {
          const extra = b === 0 ? heads.filter(Boolean) : [];
          const out = await translate(book.id, lang, [...extra, ...batches[b]]);
          if (b === 0) {
            let h = 0;
            newHeads = heads.map((s) => (s ? out[h++] : s));
          }
          answers.push(out.slice(extra.length));
        }
        const content: DocNode | null = job ? job.finish(answers) : null;
        await pb()
          .collection("chapters")
          .create<Chapter>({
            owner: userId(),
            book: created.id,
            title: newHeads[0],
            subtitle: newHeads[1],
            kind: c.kind,
            section: c.section,
            order: c.order,
            content,
            word_count: countWords(content),
            status: "draft",
            is_sample: c.is_sample,
            in_toc: c.in_toc,
            numbered: c.numbered,
            options: c.options,
          });
      }
      setStep({ done: total, total, label: "" });
      trackUsage("translate", lang);
      setMade({ id: created.id, title: created.title });
    } catch (e) {
      setError({ text: `${e instanceof Error ? e.message : String(e)} The ${name} copy so far is kept in your books; you can delete it and start again.`, setup: (e as { setup?: boolean }).setup });
    } finally {
      setBusy(false);
    }
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
        About {words.toLocaleString()} words. Your AI provider bills you for it; a whole book usually costs a few dollars or less. Keep this page open until it finishes.
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
          Done. <strong>{made.title}</strong> is your {languageName(lang)} edition, and it is in Your books under {languageName(lang)}.{" "}
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
