"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { StudioNav } from "@/components/studio/studio-nav";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, Panel } from "@/components/studio/book/details-tab";
import { getSiteSettings, listBooks, userId } from "@/lib/studio";
import { errorMessage, pb } from "@/lib/pb";
import type { Book, SiteSettings } from "@/lib/types";

const EMPTY = { publisher_name: "Jollof Pages", tagline: "", intro: "", about: "", email: "", hero_book: "", socials: [] as { label: string; url: string }[] };

export default function SiteSettingsPage() {
  const [rec, setRec] = useState<SiteSettings | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [books, setBooks] = useState<Book[]>([]);
  const [subs, setSubs] = useState<{ email: string; created: string }[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    getSiteSettings().then((s) => {
      setRec(s);
      if (s) setForm({ publisher_name: s.publisher_name, tagline: s.tagline, intro: s.intro, about: s.about, email: s.email, hero_book: s.hero_book, socials: s.socials ?? [] });
    });
    listBooks().then(setBooks);
    pb()
      .collection("subscribers")
      .getFullList<{ email: string; created: string }>({ sort: "-created" })
      .then(setSubs)
      .catch(() => undefined);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = { ...form, socials: form.socials.filter((s) => s.url) };
      const saved = rec ? await pb().collection("site_settings").update<SiteSettings>(rec.id, data) : await pb().collection("site_settings").create<SiteSettings>({ ...data, owner: userId() });
      setRec(saved);
      setMsg("Saved. The website updates within a minute.");
    } catch (err) {
      setMsg(`Could not save: ${errorMessage(err)}`);
    }
  }

  return (
    <>
      <StudioNav />
      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3 pt-10">
          <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] tracking-[-0.02em]">Publisher site</h1>
          <Link href="/" target="_blank" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
            Open the site <ExternalLink className="size-3.5" />
          </Link>
        </div>
        <form onSubmit={save}>
          <Panel title="Identity" description="Shown in the header, the footer and search results.">
            <Field id="s-name" label="Publisher name">
              <Input id="s-name" value={form.publisher_name} onChange={(e) => setForm({ ...form, publisher_name: e.target.value })} />
            </Field>
            <Field id="s-tag" label="Headline" hint="The large line on the home page. Keep it under 34 characters.">
              <Input id="s-tag" value={form.tagline} maxLength={80} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
            </Field>
            <Field id="s-intro" label="Introduction" hint="One or two sentences under the headline.">
              <Textarea id="s-intro" rows={3} value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} />
            </Field>
            <Field id="s-hero" label="Lead book" hint="Shown first on the home page. Otherwise the featured book is used.">
              <select id="s-hero" value={form.hero_book} onChange={(e) => setForm({ ...form, hero_book: e.target.value })} className="h-9 rounded-md border border-input bg-card px-3 text-sm">
                <option value="">Featured book</option>
                {books
                  .filter((b) => b.published)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
              </select>
            </Field>
          </Panel>
          <Panel title="About" description="A letter from the publisher, in the first person. Leave a blank line between paragraphs.">
            <Textarea aria-label="About" rows={10} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
          </Panel>
          <Panel title="Contact" description="For readers, bookshops and press.">
            <Field id="s-email" label="Email">
              <Input id="s-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <ul className="grid gap-2">
              {form.socials.map((s, i) => (
                <li key={i} className="grid grid-cols-[9rem_1fr_auto] gap-2">
                  <Input aria-label="Network" placeholder="Instagram" value={s.label} onChange={(e) => setForm({ ...form, socials: form.socials.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                  <Input aria-label="Profile link" type="url" placeholder="https://" value={s.url} onChange={(e) => setForm({ ...form, socials: form.socials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} />
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => setForm({ ...form, socials: form.socials.filter((_, j) => j !== i) })}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, socials: [...form.socials, { label: "", url: "" }] })}>
                <Plus /> Add a profile
              </Button>
            </div>
          </Panel>
          <div className="sticky bottom-0 flex items-center gap-3 bg-background/95 py-4">
            <Button type="submit">Save site</Button>
            <span className="text-sm text-soft" role="status">
              {msg}
            </span>
          </div>
        </form>
        <Panel title="Reader list" description="People who joined from the website. Export them to your email tool.">
          <p className="text-sm">{subs.length} readers</p>
          {subs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const csv = "email,joined\n" + subs.map((s) => `${s.email},${s.created}`).join("\n");
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                a.download = "jollof-pages-readers.csv";
                a.click();
              }}
            >
              Download CSV
            </Button>
          )}
        </Panel>
      </main>
    </>
  );
}
