"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { StudioNav } from "@/components/studio/studio-nav";
import { Field, Panel } from "@/components/studio/book/details-tab";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { listAuthors, listBooks, uniqueSlug, userId } from "@/lib/studio";
import { slugify } from "@/lib/slug";
import { errorMessage, fileUrl, pb } from "@/lib/pb";
import type { Author, Book } from "@/lib/types";

/** Pen names: every name a book can be published under, with the bio and photo shown on the site. */
export default function AuthorsPage() {
  const [authors, setAuthors] = useState<Author[] | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState("");
  const [list, setList] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    Promise.all([listAuthors(), listBooks()])
      .then(([a, b]) => {
        setAuthors(a);
        setBooks(b);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);
  useEffect(load, [load]);

  async function addNames(e: React.FormEvent) {
    e.preventDefault();
    const have = new Set((authors ?? []).map((a) => a.name.toLowerCase()));
    const names = [...new Set(list.split(/[\n,;]+/).map((n) => n.trim()).filter(Boolean))].filter((n) => !have.has(n.toLowerCase()));
    if (!names.length) return setMsg("Those names are already here.");
    try {
      for (const name of names) {
        await pb()
          .collection("authors")
          .create({ owner: userId(), name, slug: await uniqueSlug("authors", slugify(name)) });
      }
      setList("");
      setMsg(`Added ${names.length} ${names.length === 1 ? "pen name" : "pen names"}.`);
      load();
    } catch (err) {
      setMsg(`Could not add: ${errorMessage(err)}`);
    }
  }

  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
        <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] leading-tight tracking-[-0.02em]">Pen names</h1>
        <p className="mt-1 text-soft">Every book is published under one of these names. The bio and photo appear on the book&apos;s page and in its About the author page.</p>
        {error && <p className="mt-6 bg-[#fdecea] p-3 text-sm text-destructive">Could not load: {error}</p>}

        <form onSubmit={addNames}>
          <Panel title="Add pen names" description="Paste your list, one name per line. Names already here are skipped.">
            <Textarea aria-label="Pen names, one per line" rows={5} placeholder={"Ada Okafor\nT. J. Bassey"} value={list} onChange={(e) => setList(e.target.value)} />
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={!list.trim()}>
                <Plus /> Add names
              </Button>
              <span className="text-sm text-soft" role="status">
                {msg}
              </span>
            </div>
          </Panel>
        </form>

        {authors === null && !error ? (
          <p className="mt-8 text-soft" role="status">
            Loading pen names…
          </p>
        ) : (
          (authors ?? []).map((a) => (
            <AuthorEditor
              key={a.id}
              author={a}
              books={books.filter((b) => b.author === a.id)}
              onSaved={(rec) => setAuthors((all) => (all ?? []).map((x) => (x.id === rec.id ? rec : x)))}
              onDeleted={() => setAuthors((all) => (all ?? []).filter((x) => x.id !== a.id))}
            />
          ))
        )}
      </main>
    </>
  );
}

function AuthorEditor({ author, books, onSaved, onDeleted }: { author: Author; books: Book[]; onSaved: (a: Author) => void; onDeleted: () => void }) {
  const [form, setForm] = useState({ name: author.name, bio: author.bio, website: author.website });
  const [photo, setPhoto] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const id = author.id;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data: Record<string, unknown> = { ...form };
      if (photo) data.photo = photo;
      onSaved(await pb().collection("authors").update<Author>(id, data));
      setMsg("Saved.");
    } catch (err) {
      setMsg(`Could not save: ${errorMessage(err)}`);
    }
  }

  async function remove() {
    if (books.length) return setMsg(`Move ${books.map((b) => b.title).join(", ")} to another pen name first.`);
    if (!confirm(`Delete the pen name ${author.name}?`)) return;
    try {
      await pb().collection("authors").delete(id);
      onDeleted();
    } catch (err) {
      setMsg(`Could not delete: ${errorMessage(err)}`);
    }
  }

  return (
    <form onSubmit={save}>
      <Panel title={author.name} description={books.length ? `Author of ${books.map((b) => b.title).join(", ")}.` : "No books yet. Pick this name on a book's Details tab."}>
        <div className="flex items-center gap-4">
          {author.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl(author, author.photo, "400x400")} alt="" className="size-16 object-cover" />
          ) : (
            <div className="size-16 bg-paper-2" aria-hidden />
          )}
          <Field id={`${id}-photo`} label="Photo">
            <Input id={`${id}-photo`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
          </Field>
        </div>
        <Field id={`${id}-name`} label="Name">
          <Input id={`${id}-name`} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field id={`${id}-bio`} label="Biography">
          <Textarea id={`${id}-bio`} rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </Field>
        <Field id={`${id}-web`} label="Website">
          <Input id={`${id}-web`} type="url" placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="outline">
            Save
          </Button>
          <Button type="button" variant="ghost" onClick={remove}>
            <Trash2 /> Delete
          </Button>
          <span className="text-sm text-soft" role="status">
            {msg}
          </span>
        </div>
      </Panel>
    </form>
  );
}
