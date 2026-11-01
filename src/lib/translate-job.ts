"use client";

import { useSyncExternalStore } from "react";
import { pb } from "@/lib/pb";
import { sortChapters } from "@/lib/book-model";
import { countWords, type DocNode } from "@/lib/doc/types";
import { withoutSuggestions } from "@/lib/doc/suggestions";
import { languageName, planTranslation } from "@/lib/translate";
import { slugify } from "@/lib/slug";
import { trackUsage } from "@/lib/usage";
import { uniqueSlug, userId } from "@/lib/studio";
import type { Book, Chapter } from "@/lib/types";

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

export interface TranslateJob {
  fromId: string;
  fromTitle: string;
  lang: string;
  busy: boolean;
  step: { done: number; total: number; label: string } | null;
  error: { text: string; setup?: boolean } | null;
  made: { id: string; title: string } | null;
}

/**
 * Translations run here, outside any page, so the writer can leave the Translate panel and keep
 * working anywhere in the Desk while it goes. A small card in the corner shows progress. Only
 * closing the tab stops it (the page warns first); the edition so far stays in Your books.
 */
let job: TranslateJob | null = null;
const listeners = new Set<() => void>();
const emit = (patch: Partial<TranslateJob>) => {
  if (!job) return;
  job = { ...job, ...patch };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const useTranslateJob = () =>
  useSyncExternalStore(
    subscribe,
    () => job,
    () => null,
  );
export function dismissTranslateJob() {
  if (job?.busy) return;
  job = null;
  listeners.forEach((l) => l());
}

const warn = (e: BeforeUnloadEvent) => {
  e.preventDefault();
};

export async function startTranslation(book: Book, chapterList: Chapter[], lang: string) {
  if (job?.busy) return;
  job = { fromId: book.id, fromTitle: book.title, lang, busy: true, step: null, error: null, made: null };
  listeners.forEach((l) => l());
  window.addEventListener("beforeunload", warn);
  const setStep = (step: TranslateJob["step"]) => emit({ step });
  const name = languageName(lang);
  try {
    const chapters = sortChapters(chapterList);
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
    emit({ made: { id: created.id, title: created.title } });
  } catch (e) {
    emit({
      error: { text: `${e instanceof Error ? e.message : String(e)} The ${name} copy so far is kept in your books; you can delete it and start again.`, setup: (e as { setup?: boolean }).setup },
    });
  } finally {
    window.removeEventListener("beforeunload", warn);
    emit({ busy: false });
  }
}
