"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listAuthors, uniqueSlug, userId } from "@/lib/studio";
import { slugify } from "@/lib/slug";
import { errorMessage, fileUrl, pb } from "@/lib/pb";
import { BOOK_STATUSES, type Author, type Book, type BookStatus } from "@/lib/types";
import type { Workspace } from "./workspace";
import { AiSuggest } from "../ai-suggest";
import { toWebp } from "@/lib/webp";

export function Field({ id, label, hint, action, children }: { id: string; label: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      {action ? (
        <div className="-my-1 flex items-center justify-between gap-2">
          <Label htmlFor={id}>{label}</Label>
          {action}
        </div>
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
      {children}
      {hint && <p className="text-[13px] text-soft">{hint}</p>}
    </div>
  );
}

export function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b border-border py-8 md:grid-cols-[16rem_1fr]">
      <div>
        <h2 className="font-medium">{title}</h2>
        {description && <p className="mt-1 text-sm text-soft">{description}</p>}
      </div>
      <div className="grid max-w-2xl gap-4">{children}</div>
    </section>
  );
}

export function DetailsTab({ ws }: { ws: Workspace }) {
  const { book } = ws;
  const [d, setD] = useState({
    title: book.title,
    subtitle: book.subtitle,
    series: book.series,
    series_number: book.series_number || 0,
    description: book.description,
    pitch: book.pitch,
    keywords: [...(book.keywords ?? []), "", "", "", "", "", "", ""].slice(0, 7),
    categories: (book.categories ?? []).join(", "),
    language: book.language || "en",
    isbn_ebook: book.isbn_ebook,
    isbn_paperback: book.isbn_paperback,
    isbn_hardcover: book.isbn_hardcover ?? "",
    imprint: book.imprint,
    publication_date: book.publication_date?.slice(0, 10) ?? "",
    status: book.status || "drafting",
  });
  const [msg, setMsg] = useState("");
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));
  // suggestions read the saved book, plus what is typed here but not saved yet
  const typed = () => ({ "Title (as typed)": d.title, "Subtitle (as typed)": d.subtitle, "Description (as typed)": d.description, "Hook (as typed)": d.pitch });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      const patch: Partial<Book> = {
        ...d,
        keywords: d.keywords.map((k) => k.trim()).filter(Boolean),
        categories: d.categories
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        publication_date: d.publication_date ? `${d.publication_date} 12:00:00.000Z` : "",
        status: d.status as BookStatus,
      };
      if (d.title !== book.title && !book.published) patch.slug = await uniqueSlug("books", slugify(d.title), book.id);
      await ws.saveBook(patch);
      setMsg("Saved.");
    } catch (err) {
      setMsg(`Could not save: ${errorMessage(err)}`);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
      <form onSubmit={save}>
        <Panel title="Title" description="As it appears on the cover, the title page and every store.">
          <Field id="d-title" label="Title" action={<AiSuggest kind="title" bookId={book.id} context={typed} onPick={(v) => set("title", v)} />}>
            <Input id="d-title" required value={d.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field
            id="d-sub"
            label="Subtitle"
            action={<AiSuggest kind="subtitle" bookId={book.id} context={typed} onPick={(v) => set("subtitle", v)} />}
            hint="Non-fiction subtitles carry search terms. Say who it is for and what it does."
          >
            <Input id="d-sub" value={d.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
          </Field>
          <div className="grid grid-cols-[1fr_8rem] gap-3">
            <Field id="d-series" label="Series">
              <Input id="d-series" value={d.series} onChange={(e) => set("series", e.target.value)} />
            </Field>
            <Field id="d-sn" label="Number">
              <Input id="d-sn" type="number" min={0} value={d.series_number || ""} onChange={(e) => set("series_number", Number(e.target.value))} />
            </Field>
          </div>
          <Field id="d-status" label="Stage">
            <select id="d-status" value={d.status} onChange={(e) => set("status", e.target.value as BookStatus)} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
              {BOOK_STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </Panel>
        <Panel title="Description" description="The blurb for the back cover, the store page and your website.">
          <Field
            id="d-pitch"
            label="One-line hook"
            action={<AiSuggest kind="pitch" bookId={book.id} context={typed} onPick={(v) => set("pitch", v)} />}
            hint="Shown large on your website. About 20 words."
          >
            <Input id="d-pitch" value={d.pitch} maxLength={300} onChange={(e) => set("pitch", e.target.value)} />
          </Field>
          <Field
            id="d-desc"
            label="Book description"
            action={<AiSuggest kind="description" bookId={book.id} context={typed} onPick={(v) => set("description", v)} />}
            hint={`${d.description.length} of 4,000 characters (KDP's limit). Leave a blank line between paragraphs.`}
          >
            <Textarea id="d-desc" rows={9} maxLength={8000} value={d.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
        </Panel>
        <Panel title="Discovery" description="KDP gives you seven keyword boxes and lets you choose categories when you upload.">
          <div className="-mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Keywords</span>
            <AiSuggest
              kind="keywords"
              bookId={book.id}
              context={typed}
              onPick={(v) => {
                const i = d.keywords.findIndex((k) => !k.trim());
                set(
                  "keywords",
                  d.keywords.map((x, j) => (j === (i < 0 ? 6 : i) ? v : x)),
                );
              }}
              onPickAll={(items) => set("keywords", [...items, "", "", "", "", "", "", ""].slice(0, 7))}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {d.keywords.map((k, i) => (
              <Input
                key={i}
                aria-label={`Keyword ${i + 1}`}
                placeholder={`Keyword ${i + 1}`}
                value={k}
                maxLength={50}
                onChange={(e) =>
                  set(
                    "keywords",
                    d.keywords.map((x, j) => (j === i ? e.target.value : x)),
                  )
                }
              />
            ))}
          </div>
          <Field
            id="d-cat"
            label="Categories"
            action={<AiSuggest kind="categories" bookId={book.id} context={typed} onPick={(v) => set("categories", d.categories.trim() ? `${d.categories}, ${v}` : v)} />}
            hint="Separate with commas, for example: Business, Entrepreneurship"
          >
            <Input id="d-cat" value={d.categories} onChange={(e) => set("categories", e.target.value)} />
          </Field>
          <Field id="d-lang" label="Language code" hint="en, en-GB, fr, yo, ig, ha…">
            <Input id="d-lang" value={d.language} maxLength={12} onChange={(e) => set("language", e.target.value)} className="w-32" />
          </Field>
        </Panel>
        <Panel title="Publishing" description="ISBNs are optional for KDP; Amazon assigns a free one to paperbacks and hardcovers. Each edition needs its own.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="d-isbn-p" label="Paperback ISBN">
              <Input id="d-isbn-p" value={d.isbn_paperback} onChange={(e) => set("isbn_paperback", e.target.value)} />
            </Field>
            <Field id="d-isbn-h" label="Hardcover ISBN">
              <Input id="d-isbn-h" value={d.isbn_hardcover} onChange={(e) => set("isbn_hardcover", e.target.value)} />
            </Field>
            <Field id="d-isbn-e" label="Ebook ISBN">
              <Input id="d-isbn-e" value={d.isbn_ebook} onChange={(e) => set("isbn_ebook", e.target.value)} />
            </Field>
            <Field id="d-imprint" label="Imprint">
              <Input id="d-imprint" value={d.imprint} onChange={(e) => set("imprint", e.target.value)} />
            </Field>
            <Field id="d-date" label="Publication date">
              <Input id="d-date" type="date" value={d.publication_date} onChange={(e) => set("publication_date", e.target.value)} />
            </Field>
          </div>
        </Panel>
        <div className="sticky bottom-0 flex items-center gap-3 bg-background/95 py-4">
          <Button type="submit">Save changes</Button>
          <span className="text-sm text-soft" role="status">
            {msg}
          </span>
        </div>
      </form>
      <AuthorPanel ws={ws} />
    </div>
  );
}

function AuthorPanel({ ws }: { ws: Workspace }) {
  const [authors, setAuthors] = useState<Author[] | null>(null);
  useEffect(() => {
    listAuthors().then(setAuthors);
  }, []);
  if (!authors) return null;
  const current = authors.find((a) => a.id === ws.book.author) ?? null;
  return <AuthorForm key={current?.id ?? "new"} ws={ws} authors={authors} setAuthors={setAuthors} current={current} />;
}

function AuthorForm({ ws, authors, setAuthors, current }: { ws: Workspace; authors: Author[]; setAuthors: (a: Author[]) => void; current: Author | null }) {
  const [form, setForm] = useState({ name: current?.name ?? "", bio: current?.bio ?? "", website: current?.website ?? "" });
  const [photo, setPhoto] = useState<File | null>(null);
  const [msg, setMsg] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data: Record<string, unknown> = { ...form };
      if (photo) data.photo = await toWebp(photo);
      let rec: Author;
      if (current) rec = await pb().collection("authors").update<Author>(current.id, data);
      else {
        rec = await pb()
          .collection("authors")
          .create<Author>({ ...data, owner: userId(), slug: await uniqueSlug("authors", slugify(form.name)) });
        await ws.saveBook({ author: rec.id });
      }
      setAuthors([...authors.filter((a) => a.id !== rec.id), rec]);
      ws.setBook((b) => (b ? { ...b, expand: { ...b.expand, author: rec } } : b));
      setMsg("Author saved.");
    } catch (err) {
      setMsg(`Could not save: ${errorMessage(err)}`);
    }
  }

  return (
    <form onSubmit={save}>
      <Panel title="Author" description="Used on the title page, the About the author page and your website. Add a pen name for books you publish under another name.">
        {authors.length > 1 && (
          <Field id="a-pick" label="Pen name for this book">
            <select id="a-pick" value={ws.book.author} onChange={(e) => ws.saveBook({ author: e.target.value })} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="flex items-center gap-4">
          {current?.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl(current, current.photo, "400x400")} alt="" className="size-16 rounded-full object-cover" />
          ) : (
            <div className="size-16 rounded-full bg-paper-2" aria-hidden />
          )}
          <Field id="a-photo" label="Photo">
            <Input id="a-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
        <Field id="a-name" label="Name" action={<AiSuggest kind="penname" bookId={ws.book.id} onPick={(v) => setForm({ ...form, name: v })} />}>
          <Input id="a-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field id="a-bio" label="Biography">
          <Textarea id="a-bio" rows={5} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </Field>
        <Field id="a-web" label="Website">
          <Input id="a-web" type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="outline">
            Save author
          </Button>
          <span className="text-sm text-soft" role="status">
            {msg}
          </span>
        </div>
      </Panel>
    </form>
  );
}
