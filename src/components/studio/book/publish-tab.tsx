"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Panel } from "./details-tab";
import { uniqueSlug } from "@/lib/studio";
import { slugify } from "@/lib/slug";
import { errorMessage, pb } from "@/lib/pb";
import { coverGeometry, maxPages, MIN_PAGES, getTrim } from "@/lib/kdp";
import { bookFormat, type BuyLink } from "@/lib/types";
import { usePageCount } from "./format-tab";
import type { Workspace } from "./workspace";

const STORES = ["Amazon", "Apple Books", "Kobo", "Barnes & Noble", "Google Play Books", "Bookshop.org", "Okadabooks", "Selar"];

export function PublishTab({ ws }: { ws: Workspace }) {
  const { book } = ws;
  const [links, setLinks] = useState<BuyLink[]>(book.buy_links ?? []);
  const [slug, setSlug] = useState(book.slug);
  const [msg, setMsg] = useState("");
  const samples = ws.chapters.filter((c) => c.is_sample);

  async function saveLinks(next: BuyLink[]) {
    setLinks(next);
    await ws.saveBook({ buy_links: next.filter((l) => l.url.trim()) });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
      <Panel title="On your website" description="Published books appear in the catalog on the public site with their cover, description and buy links.">
        <label className="flex items-center gap-3 rounded-md bg-card p-4">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={book.published} onChange={(e) => ws.saveBook({ published: e.target.checked, status: e.target.checked ? "published" : book.status })} />
          <span>
            <span className="block font-medium">Show this book on the website</span>
            <span className="block text-sm text-soft">{book.published ? "Live now." : "Hidden. Only you can see it."}</span>
          </span>
          {book.published && (
            <Link href={`/books/${book.slug}`} target="_blank" className="ml-auto inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
              View page <ExternalLink className="size-3.5" />
            </Link>
          )}
        </label>
        <label className="flex items-center gap-3 rounded-md bg-card p-4">
          <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={book.featured} onChange={(e) => ws.saveBook({ featured: e.target.checked })} />
          <span>
            <span className="block font-medium">Feature on the home page</span>
            <span className="block text-sm text-soft">The featured book leads the home page.</span>
          </span>
        </label>
        <Field id="p-slug" label="Web address" hint={`jollofpages.com/books/${slug}`}>
          <div className="flex gap-2">
            <Input id="p-slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const s = await uniqueSlug("books", slugify(slug), book.id);
                  setSlug(s);
                  await ws.saveBook({ slug: s });
                  setMsg("Address saved.");
                } catch (e) {
                  setMsg(errorMessage(e));
                }
              }}
            >
              Save
            </Button>
          </div>
        </Field>
        <Field id="p-accent" label="Accent colour" hint="Used behind the book on its page when there is no cover yet.">
          <input id="p-accent" type="color" value={book.accent || "#0b6e3c"} onChange={(e) => ws.saveBook({ accent: e.target.value })} className="h-9 w-16 rounded border border-input bg-card" />
        </Field>
        <p className="text-sm text-soft" role="status">
          {msg}
        </p>
      </Panel>

      <Panel title="Free sample" description="Readers can read sample chapters on the book's page. Mark a chapter as a sample from its menu on the Write tab.">
        {samples.length ? (
          <ul className="grid gap-2">
            {samples.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-md bg-card p-3 text-sm">
                {c.title}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    ws.setChapters((all) => all.map((x) => (x.id === c.id ? { ...x, is_sample: false } : x)));
                    await ws.track(pb().collection("chapters").update(c.id, { is_sample: false }));
                  }}
                >
                  <X /> Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Choose a sample chapter"
              defaultValue=""
              onChange={async (e) => {
                const id = e.target.value;
                if (!id) return;
                ws.setChapters((all) => all.map((x) => (x.id === id ? { ...x, is_sample: true } : x)));
                await ws.track(pb().collection("chapters").update(id, { is_sample: true }));
              }}
              className="h-9 rounded-md border border-input bg-card px-3 text-sm"
            >
              <option value="">Choose a chapter…</option>
              {ws.chapters
                .filter((c) => c.section !== "front" || c.kind === "introduction")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
            </select>
          </div>
        )}
      </Panel>

      <Panel title="Where to buy" description="Links shown on the book's page. Add them once the book is live on each store.">
        <ul className="grid gap-2">
          {links.map((l, i) => (
            <li key={i} className="grid grid-cols-[10rem_1fr_auto] gap-2">
              <Input aria-label="Store" list="stores" value={l.label} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} onBlur={() => saveLinks(links)} />
              <Input aria-label="Link" type="url" placeholder="https://" value={l.url} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} onBlur={() => saveLinks(links)} />
              <Button variant="ghost" size="icon" aria-label="Remove link" onClick={() => saveLinks(links.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
        <datalist id="stores">
          {STORES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <div>
          <Button variant="outline" size="sm" onClick={() => setLinks([...links, { label: links.length ? "" : "Amazon", url: "" }])}>
            <Plus /> Add a store
          </Button>
        </div>
      </Panel>

      <KdpChecklist ws={ws} />
    </div>
  );
}

function KdpChecklist({ ws }: { ws: Workspace }) {
  const { book } = ws;
  const f = bookFormat(book);
  const { pages, estimated } = usePageCount(ws);
  const max = maxPages(getTrim(f.trim), f.paper);
  const cover = coverGeometry(f.trim, pages, f.paper);
  const items: [boolean, string][] = [
    [!!book.title && !!book.expand?.author?.name, "Title and author name"],
    [!!book.description && book.description.length <= 4000, "Description under 4,000 characters"],
    [(book.keywords ?? []).length > 0 && (book.keywords ?? []).length <= 7, "Up to seven keywords"],
    [(book.categories ?? []).length > 0, "Categories chosen"],
    [ws.chapters.every((c) => c.status === "final"), "Every section marked final"],
    [!estimated && pages >= MIN_PAGES && pages <= max, `Print PDF built, ${MIN_PAGES}–${max} pages`],
    [!!book.cover, "Ebook cover (front only)"],
    [!!book.cover_full, `Paperback cover PDF, ${cover.width.toFixed(3)} x ${cover.height.toFixed(3)} in`],
  ];
  return (
    <Panel title="Amazon KDP checklist" description="KDP uploads stay manual. When everything here is ticked, download the files from the Export tab and upload them at kdp.amazon.com.">
      <ul className="grid gap-1.5">
        {items.map(([ok, label]) => (
          <li key={label} className="flex items-center gap-2.5 text-sm">
            <span className={ok ? "grid size-5 place-items-center rounded-full bg-primary text-white" : "grid size-5 place-items-center rounded-full bg-paper-2 text-soft"}>
              {ok ? <Check className="size-3.5" /> : <span className="size-1.5 rounded-full bg-soft" />}
            </span>
            <span className={ok ? "text-ink" : "text-ink-2"}>{label}</span>
          </li>
        ))}
      </ul>
      <a href="https://kdp.amazon.com/en_US/bookshelf" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
        Open your KDP bookshelf <ExternalLink className="size-3.5" />
      </a>
    </Panel>
  );
}
