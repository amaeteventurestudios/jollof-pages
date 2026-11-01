"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, Panel } from "./details-tab";
import { uniqueSlug } from "@/lib/studio";
import { slugify } from "@/lib/slug";
import { errorMessage, pb } from "@/lib/pb";
import { coverGeometry, HARDCOVER, maxPages, MIN_PAGES, getTrim } from "@/lib/kdp";
import { bookFormat, printEdition, type BuyLink, type Quote } from "@/lib/types";
import { usePageCount } from "./format-tab";
import type { Workspace } from "./workspace";
import { useMySite } from "../use-my-site";

const STORES = ["Amazon", "Apple Books", "Kobo", "Barnes & Noble", "Google Play Books", "Bookshop.org", "Okadabooks", "Selar"];
/** Stores we'll fill in by ourselves one day; for now the writer pastes the link. */
const AUTO_SOON = ["Apple Books", "Barnes & Noble", "Kobo", "Google Play Books"];

export function PublishTab({ ws }: { ws: Workspace }) {
  const { book } = ws;
  const [links, setLinks] = useState<BuyLink[]>(book.buy_links ?? []);
  const [slug, setSlug] = useState(book.slug);
  const [msg, setMsg] = useState("");
  const samples = ws.chapters.filter((c) => c.is_sample);
  // a book added from Amazon or an ISBN: already published, nothing written here
  const imported = ws.chapters.length === 0;
  const { url: siteBase } = useMySite();

  async function saveLinks(next: BuyLink[]) {
    setLinks(next);
    await ws.saveBook({ buy_links: next.filter((l) => l.url.trim()) });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
      <Panel title="On your website" description="Published books appear in the catalog on the public site with their cover, description and buy links.">
        <label className="flex items-center gap-3 rounded-md bg-card p-4">
          <input
            type="checkbox"
            className="size-4 accent-[var(--primary)]"
            checked={book.published}
            onChange={(e) => ws.saveBook({ published: e.target.checked, status: e.target.checked ? "published" : book.status })}
          />
          <span>
            <span className="block font-medium">Show this book on the website</span>
            <span className="block text-sm text-soft">{book.published ? "Live now." : "Hidden. Only you can see it."}</span>
          </span>
          {book.published && (
            <Link href={`${siteBase.replace(/\/$/, "")}/books/${book.slug}`} target="_blank" className="ml-auto inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
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
        <Field id="p-slug" label="Web address" hint={`${siteBase.replace(/^https?:\/\//, "").replace(/\/$/, "")}/books/${slug}`}>
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
        <Field id="p-accent" label="Page colour" hint="The colour of the book's page on your website, and of its cover until you add one. Changes show within a minute.">
          <input id="p-accent" type="color" value={book.accent || "#ad3a17"} onChange={(e) => ws.saveBook({ accent: e.target.value })} className="h-9 w-16 rounded border border-input bg-card" />
        </Field>
        <p className="text-sm text-soft" role="status">
          {msg}
        </p>
      </Panel>

      {!imported && (
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
      )}

      <Panel title="Where to buy" description="Buttons on the book's page, with the price if you add one. Add them once the book is live on each store.">
        <ul className="grid gap-2">
          {links.map((l, i) => (
            <li key={i} className="grid grid-cols-[9rem_5rem_1fr_auto] gap-2">
              <Input
                aria-label="Store"
                list="stores"
                value={l.label}
                onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                onBlur={() => saveLinks(links)}
              />
              <Input
                aria-label="Price"
                placeholder="Price"
                value={l.price ?? ""}
                onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
                onBlur={() => saveLinks(links)}
              />
              <Input
                aria-label="Link"
                type="url"
                placeholder="https://"
                value={l.url}
                onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
                onBlur={() => saveLinks(links)}
              />
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
        <div className="flex flex-wrap items-center gap-2">
          <Plus className="size-4 text-soft" />
          <select
            aria-label="Add a store"
            value=""
            onChange={(e) => e.target.value && setLinks([...links, { label: e.target.value === "Other" ? "" : e.target.value, url: "" }])}
            className="h-8 rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">Add a store…</option>
            {STORES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="Other">Another store</option>
          </select>
        </div>
        <p className="text-[13px] text-soft">Paste the link to your book on each store. Filling in {AUTO_SOON.join(", ").replace(/, ([^,]*)$/, " and $1")} by themselves is coming soon.</p>
      </Panel>

      <Panel title="Sell the ebook yourself" description="Readers buy the ebook on your website and download it straight away, with the money paid to you.">
        <p className="w-fit self-start bg-paper-2 px-2 py-1 text-sm font-medium text-ink-2">Coming soon</p>
      </Panel>

      <QuotesPanel ws={ws} field="praise" title="Praise" description="Quotes from people about the book, shown under Praise on its page." sourceLabel="Name" roleLabel="Who they are" />
      <QuotesPanel ws={ws} field="reviews" title="Reviews" description="Excerpts from published reviews, shown under Reviews with a link to the full review." sourceLabel="Publication" />

      {!imported && <KdpChecklist ws={ws} />}
    </div>
  );
}

function QuotesPanel({
  ws,
  field,
  title,
  description,
  sourceLabel,
  roleLabel,
}: {
  ws: Workspace;
  field: "praise" | "reviews";
  title: string;
  description: string;
  sourceLabel: string;
  roleLabel?: string;
}) {
  const [items, setItems] = useState<Quote[]>(ws.book[field] ?? []);
  const save = (next: Quote[]) => {
    setItems(next);
    return ws.saveBook({ [field]: next.filter((q) => q.quote.trim()) });
  };
  const edit = (i: number, patch: Partial<Quote>) => setItems(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <Panel title={title} description={description}>
      {items.map((q, i) => (
        <div key={i} className="grid gap-2 border-l-2 border-primary pl-4">
          <Textarea aria-label="Quote" rows={3} placeholder="The quote, without quotation marks" value={q.quote} onChange={(e) => edit(i, { quote: e.target.value })} onBlur={() => save(items)} />
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input aria-label={sourceLabel} placeholder={sourceLabel} value={q.source} onChange={(e) => edit(i, { source: e.target.value })} onBlur={() => save(items)} />
            {roleLabel ? (
              <Input aria-label={roleLabel} placeholder={roleLabel} value={q.role ?? ""} onChange={(e) => edit(i, { role: e.target.value })} onBlur={() => save(items)} />
            ) : (
              <Input aria-label="Link to the review" type="url" placeholder="https://" value={q.url ?? ""} onChange={(e) => edit(i, { url: e.target.value })} onBlur={() => save(items)} />
            )}
            <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => save(items.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </div>
        </div>
      ))}
      <div>
        <Button variant="outline" size="sm" onClick={() => setItems([...items, { quote: "", source: "" }])}>
          <Plus /> Add {field === "praise" ? "praise" : "a review"}
        </Button>
      </div>
    </Panel>
  );
}

function KdpChecklist({ ws }: { ws: Workspace }) {
  const { book } = ws;
  const f = bookFormat(book);
  const { pages, estimated } = usePageCount(ws);
  const max = maxPages(getTrim(f.trim), f.paper);
  const cover = coverGeometry(f.trim, pages, f.paper);
  const hard = usePageCount(ws, "hardcover");
  const hc = printEdition(f, "hardcover");
  const hcover = coverGeometry(hc.trim, hard.pages, hc.paper, "hardcover");
  const items: [boolean, string][] = [
    [!!book.title && !!book.expand?.author?.name, "Title and author name"],
    [!!book.description && book.description.length <= 4000, "Description under 4,000 characters"],
    [(book.keywords ?? []).length > 0 && (book.keywords ?? []).length <= 7, "Search keywords added (Amazon takes up to 7, on the Book details tab)"],
    [(book.categories ?? []).length > 0, "Categories chosen"],
    [ws.chapters.every((c) => c.status === "final"), "Every section marked final"],
    [!estimated && pages >= MIN_PAGES && pages <= max, `Print PDF built, ${MIN_PAGES}–${max} pages`],
    [!!book.cover, "Ebook cover (front only)"],
    [!!book.cover_full, `Paperback cover PDF, ${cover.width.toFixed(3)} x ${cover.height.toFixed(3)} in`],
    ...(f.hardcover
      ? ([
          [!hard.estimated && hard.pages >= HARDCOVER.minPages && hard.pages <= HARDCOVER.maxPages, `Hardcover PDF built, ${HARDCOVER.minPages}–${HARDCOVER.maxPages} pages`],
          [!!book.cover_hardcover, `Hardcover cover PDF, ${hcover.width.toFixed(3)} x ${hcover.height.toFixed(3)} in`],
        ] as [boolean, string][])
      : []),
  ];
  return (
    <Panel
      title="Ready for Amazon KDP"
      description="What Amazon asks for when you publish this book on KDP. When every line is ticked, download your files from the Export tab, open your KDP bookshelf, choose Create, and fill it in from here."
    >
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
        Open your KDP bookshelf on Amazon <ExternalLink className="size-3.5" />
      </a>
    </Panel>
  );
}
