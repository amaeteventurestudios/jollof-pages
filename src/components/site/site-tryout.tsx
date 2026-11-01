"use client";

import { useState } from "react";
import type { IsbnBook } from "@/lib/isbn";
import { LinkGuide } from "@/components/site/link-guide";

/** Where the homepage leaves the book for the studio to add after sign-up. */
export const PENDING_BOOK = "jp-pending-book";
export interface PendingBook {
  code: string;
  title?: string;
  author?: string;
}

type Found = IsbnBook & { matched?: boolean };

const handle = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24) || "yourname";

/**
 * The homepage's "see your website": a visitor types their latest book's ISBN, ASIN or Amazon
 * link and sees it on an author website like the one they'd get, then signs up to keep it.
 */
export function SiteTryout() {
  const [code, setCode] = useState("");
  const [asin, setAsin] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function ask(url: string): Promise<(Found & { needsTitle?: boolean; guess?: string }) | null> {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(url);
      const body = (await res.json()) as Found & { error?: string; needsTitle?: boolean; guess?: string };
      if (!res.ok) throw new Error(body.error || "Lookup failed.");
      return body;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function lookUp(e: React.FormEvent) {
    e.preventDefault();
    setFound(null);
    setAsin("");
    const body = await ask(`/api/books/isbn?isbn=${encodeURIComponent(code)}`);
    if (body?.needsTitle && body.asin) {
      setAsin(body.asin);
      // a pasted Amazon link carries most of the title: try it straight away
      if (body.guess) {
        setTitle(body.guess);
        const hit = await ask(`/api/books/isbn?${new URLSearchParams({ title: body.guess, asin: body.asin })}`);
        if (hit?.matched) setFound(hit);
      }
    } else if (body) setFound(body);
  }

  async function byTitle(e: React.FormEvent) {
    e.preventDefault();
    const body = await ask(`/api/books/isbn?${new URLSearchParams({ title: title.trim(), author: author.trim(), asin })}`);
    if (body) setFound(body.matched ? body : { ...body, title: title.trim(), authors: author.trim() ? [author.trim()] : [], cover: "", description: "" });
  }

  function keep() {
    const pending: PendingBook = asin ? { code: asin, title: title.trim(), author: author.trim() } : { code: code.trim() };
    localStorage.setItem(PENDING_BOOK, JSON.stringify(pending));
  }

  const name = found?.authors[0] || author.trim() || "Your Name";
  const field = "h-14 w-full min-w-0 bg-cream px-4 text-[1.0625rem] text-char placeholder:text-char/55 outline-none focus:shadow-[inset_0_0_0_3px_var(--bonnet)]";

  return (
    <div className="mx-auto max-w-[1100px]">
      <form onSubmit={lookUp} className="mx-auto flex max-w-[720px] flex-col gap-3 sm:flex-row">
        <label htmlFor="try-code" className="sr-only">
          ISBN, ASIN or Amazon link of your latest book
        </label>
        <input id="try-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="ISBN, ASIN or Amazon link of your latest book" className={field} />
        <button type="submit" className="btn shrink-0" disabled={busy || !code.trim()}>
          {busy && !asin ? "Looking…" : "See your website"}
        </button>
      </form>

      {!asin && !found && (
        <div className="mx-auto mt-4 max-w-[720px] text-left">
          <LinkGuide dark />
        </div>
      )}
      {asin && !found && (
        <form onSubmit={byTitle} className="mx-auto mt-4 grid max-w-[720px] gap-3">
          <p className="text-cream/90">
            That&apos;s a Kindle book. Amazon doesn&apos;t share Kindle book details, so {title ? "check the title we took from your link and add your author name." : "type the title and author."}
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input required aria-label="Title" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
            <input aria-label="Author" placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} className={field} />
            <button type="submit" className="btn" disabled={busy || !title.trim()}>
              {busy ? "Looking…" : "Show me"}
            </button>
          </div>
        </form>
      )}
      {error && (
        <p className="mx-auto mt-4 max-w-[720px] bg-char/40 px-4 py-3 text-cream" role="alert">
          {error}
        </p>
      )}

      {found && (
        <div className="mt-[clamp(2rem,5vw,3.5rem)]">
          {/* a browser window around the author site they'd get */}
          <div className="overflow-hidden bg-cream text-char shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)]">
            <div className="flex items-center gap-2 bg-char px-4 py-2.5 text-[13px] text-cream/80">
              <span className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 bg-cream/30" />
                <span className="size-2.5 bg-cream/30" />
                <span className="size-2.5 bg-cream/30" />
              </span>
              <span className="mx-auto truncate bg-cream/10 px-3 py-0.5">{handle(name)}.jollofpages.com</span>
            </div>
            <div className="flex items-center justify-between border-b border-char/10 px-[clamp(1rem,4vw,3rem)] py-4">
              <span className="text-[1.25rem] font-bold tracking-[-0.02em]">{name}</span>
              <span className="flex gap-5 text-[14px] text-char/70 max-sm:hidden">
                <span>Books</span>
                <span>About</span>
                <span>Newsletter</span>
              </span>
            </div>
            <div className="grid items-center gap-[clamp(1.5rem,4vw,3.5rem)] px-[clamp(1rem,4vw,3rem)] py-[clamp(1.5rem,5vw,3.5rem)] sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="mx-auto w-full max-w-[300px]">
                {found.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={found.cover} alt={`Cover of ${found.title}`} className="w-full shadow-[0_24px_40px_-18px_rgba(0,0,0,0.5)]" />
                ) : (
                  <div className="grid aspect-[2/3] w-full place-items-center bg-jollof p-6 text-center text-cream shadow-[0_24px_40px_-18px_rgba(0,0,0,0.5)]">
                    <span>
                      <span className="block text-[1.5rem] leading-tight font-bold">{found.title}</span>
                      <span className="mt-4 block text-[12px] tracking-[0.2em] uppercase">{name}</span>
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold tracking-[0.16em] text-jollof uppercase">New from {name}</p>
                <h3 className="mt-2 text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] leading-[1.05] font-bold tracking-[-0.03em]">{found.title}</h3>
                {found.subtitle && <p className="mt-2 text-[1.125rem] text-char/75">{found.subtitle}</p>}
                {found.description && <p className="mt-4 line-clamp-4 text-char/80">{found.description}</p>}
                <div className="mt-6 flex flex-wrap gap-3">
                  <span className="inline-flex h-12 items-center bg-char px-6 font-semibold text-cream">Buy on Amazon</span>
                  <span className="inline-flex h-12 items-center px-6 font-semibold shadow-[inset_0_0_0_2px_currentColor]">Read a sample</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <a href="/signup" onClick={keep} className="btn">
              Keep this website
            </a>
            <p className="t-small text-cream/85">Comes free with the studio. Your book will be waiting on it when you sign in.</p>
          </div>
        </div>
      )}
    </div>
  );
}
