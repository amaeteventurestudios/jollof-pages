"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookPlus, ExternalLink, Plus, Trash2 } from "lucide-react";
import { IsbnDialog } from "@/components/studio/isbn-dialog";
import { StudioNav } from "@/components/studio/studio-nav";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, Panel } from "@/components/studio/book/details-tab";
import { getSiteSettings, listBooks, userId } from "@/lib/studio";
import { errorMessage, pb } from "@/lib/pb";
import type { Book, SiteSettings } from "@/lib/types";
import { hasPro, siteLabel, siteUrl } from "@/lib/sites";
import { forgetMySite } from "@/components/studio/use-my-site";
import { SiteDesignPanel } from "@/components/studio/site-design-panel";
import { ProPanel, useProStatus } from "@/components/studio/pro-panel";
import { listAuthors } from "@/lib/studio";
import { CheckCircle2, Circle } from "lucide-react";
import type { Author } from "@/lib/types";

const EMPTY = { publisher_name: "Jollof Pages", tagline: "", intro: "", about: "", email: "", hero_book: "", socials: [] as { label: string; url: string }[] };

export default function SiteSettingsPage() {
  const [rec, setRec] = useState<SiteSettings | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [subs, setSubs] = useState<{ email: string; created: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [isbnOpen, setIsbnOpen] = useState(false);
  const pro = useProStatus();
  // after buying Pro, pick up the site's new paid-up date
  const proOn = pro.status?.pro;
  useEffect(() => {
    if (proOn) getSiteSettings().then((s) => s && setRec(s));
  }, [proOn]);

  useEffect(() => {
    getSiteSettings().then((s) => {
      setRec(s);
      if (s) setForm({ publisher_name: s.publisher_name, tagline: s.tagline, intro: s.intro, about: s.about, email: s.email, hero_book: s.hero_book, socials: s.socials ?? [] });
    });
    listBooks().then(setBooks);
    listAuthors().then(setAuthors).catch(() => undefined);
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
          <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] tracking-[-0.02em]">Your website</h1>
          <Link href={siteUrl(rec)} target="_blank" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
            Open the site <ExternalLink className="size-3.5" />
          </Link>
        </div>
        {rec && !rec.home && <ReadyList site={rec} books={books} authors={authors} about={form.about} />}
        {rec && !rec.home && (
          <Panel title="Bring in your books" description="Books you published before Jollof Pages. Enter an ISBN, an ASIN or an Amazon link and the book appears on your site with its cover, description and a button to buy it.">
            <Button type="button" variant="outline" onClick={() => setIsbnOpen(true)}>
              <BookPlus /> Add a book you already published
            </Button>
          </Panel>
        )}
        <IsbnDialog open={isbnOpen} onClose={() => setIsbnOpen(false)} />
        {rec && <AddressPanel site={rec} onChange={(s) => setRec(s)} />}
        {rec && <ProPanel status={pro.status} reload={pro.reload} home={rec.home} />}
        {rec && !rec.home && <SiteDesignPanel site={rec} books={books.filter((b) => b.published)} onSaved={setRec} />}
        <form onSubmit={save}>
          <Panel title="Identity" description="Shown in the header, the footer and search results.">
            <Field id="s-name" label={rec?.home ? "Publisher name" : "Site name"} hint={rec?.home ? undefined : "Your author or pen name, as readers know you."}>
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
          <Panel title="About" description="A letter to readers, in the first person. Leave a blank line between paragraphs.">
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
          <div className="sticky bottom-0 flex items-center gap-3 bg-background/95 py-4 app:bottom-[calc(var(--app-tab-h)+env(safe-area-inset-bottom))]">
            <Button type="submit">Save site</Button>
            <span className="text-sm text-soft" role="status">
              {msg}
            </span>
          </div>
        </form>
        <Panel title="Reader list" description="People who joined from your website. Only you can see them. Export them to your email tool.">
          <p className="text-sm">{subs.length} readers</p>
          {subs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const csv = "email,joined\n" + subs.map((s) => `${s.email},${s.created}`).join("\n");
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                a.download = `${rec?.subdomain || "jollof-pages"}-readers.csv`;
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

/** Where the site lives: the free jollofpages.com address, and a domain the author owns. */
function AddressPanel({ site, onChange }: { site: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const [sub, setSub] = useState(site.subdomain ?? "");
  const [domain, setDomain] = useState(site.custom_domain ?? "");
  const [dns, setDns] = useState<{ ip: string; root: string } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/sites/address")
      .then((r) => r.json())
      .then(setDns)
      .catch(() => undefined);
  }, []);

  async function send(body: Record<string, string>, done: string) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/sites/address", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: pb().authStore.token },
        body: JSON.stringify(body),
      });
      const out = (await res.json()) as { site?: SiteSettings; error?: string };
      if (!res.ok || !out.site) throw new Error(out.error || "Could not save.");
      onChange(out.site);
      forgetMySite();
      setMsg(done);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (site.home)
    return (
      <Panel title="Address" description="This is the publisher site, served at the main domain.">
        <p className="font-medium">{siteLabel(site)}</p>
      </Panel>
    );

  const root = dns?.root || "jollofpages.com";
  return (
    <Panel title="Address" description="Your site is online as soon as you publish a book. Changing an address breaks links you have already shared.">
      <Field id="a-sub" label="Free address" hint={`Included with your Desk: ${sub || "yourname"}.${root}`}>
        <div className="flex gap-2">
          <div className="flex h-9 flex-1 items-center rounded-md border border-input bg-card pr-3 text-sm">
            <input id="a-sub" value={sub} onChange={(e) => setSub(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className="h-full min-w-0 flex-1 bg-transparent px-3 outline-none" />
            <span className="text-soft">.{root}</span>
          </div>
          <Button variant="outline" disabled={busy || sub === site.subdomain} onClick={() => send({ subdomain: sub }, "Address saved.")}>
            Save
          </Button>
        </div>
      </Field>
      {hasPro(site) ? (
        <>
      <Field id="a-domain" label="Your own domain" hint="Optional. Use a domain you bought from any registrar, such as Namecheap, GoDaddy or Cloudflare.">
        <div className="flex gap-2">
          <Input id="a-domain" placeholder="yourname.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
          <Button variant="outline" disabled={busy || !domain.trim() || domain === site.custom_domain} onClick={() => send({ custom_domain: domain }, "Connected. Your site now answers at your domain; the secure certificate is made on the first visit.")}>
            Connect
          </Button>
          {site.custom_domain && (
            <Button variant="ghost" disabled={busy} onClick={() => send({ custom_domain: "" }, "Domain disconnected.").then(() => setDomain(""))}>
              Disconnect
            </Button>
          )}
        </div>
      </Field>
      {!site.custom_domain && (
        <div className="text-sm">
          <p className="mb-2 font-medium">Before you press Connect, add these two records where you bought the domain (its DNS settings):</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border text-soft">
                  <th className="py-1.5 pr-4 font-medium">Type</th>
                  <th className="py-1.5 pr-4 font-medium">Name / Host</th>
                  <th className="py-1.5 pr-4 font-medium">Value / Points to</th>
                  <th className="py-1.5 font-medium">TTL</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-b border-border">
                  <td className="py-1.5 pr-4">A</td>
                  <td className="py-1.5 pr-4">@</td>
                  <td className="py-1.5 pr-4">{dns?.ip || "…"}</td>
                  <td className="py-1.5">Automatic</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4">CNAME</td>
                  <td className="py-1.5 pr-4">www</td>
                  <td className="py-1.5 pr-4">{domain.trim() ? domain.trim().replace(/^www\./, "") : "yourname.com"}</td>
                  <td className="py-1.5">Automatic</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-soft">If your domain is on Cloudflare, set both records to “DNS only” (grey cloud). Changes can take up to an hour to reach everyone.</p>
        </div>
      )}
        </>
      ) : (
        <div className="grid gap-1.5 rounded-md bg-muted p-4 text-sm">
          <p className="font-medium">Your own domain, such as yourname.com</p>
          <p className="text-soft">Comes with Author Site Pro, below. Your free {root} address stays yours either way.</p>
        </div>
      )}
      <p className="text-sm text-soft" role="status">
        {msg}
      </p>
    </Panel>
  );
}

/** The steps that make a site worth sharing, ticked off from what is already in the Desk. */
function ReadyList({ site, books, authors, about }: { site: SiteSettings; books: Book[]; authors: Author[]; about: string }) {
  const live = books.filter((b) => b.published);
  const steps: { done: boolean; label: string; href?: string }[] = [
    { done: live.length > 0, label: "Put a book on your site (the Publish tab of any book, or add one you already published)", href: "/desk" },
    { done: live.length > 0 && live.every((b) => b.cover), label: "Give every published book a cover", href: "/desk" },
    { done: authors.some((a) => a.bio || a.photo), label: "Add a bio or photo to your pen name", href: "/desk/authors" },
    { done: about.trim().length > 0, label: "Write a few lines to readers in About, below" },
    { done: !!site.design?.palette, label: "Pick your colours and fonts in Design, below" },
  ];
  const left = steps.filter((s) => !s.done).length;
  return (
    <Panel title="Get your site ready" description={left ? `${left} of ${steps.length} steps left. Your site is already online at ${siteLabel(site)}.` : `All done. Share ${siteLabel(site)} with your readers.`}>
      <ul className="grid gap-2">
        {steps.map((s) => (
          <li key={s.label} className="flex items-start gap-2 text-sm">
            {s.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> : <Circle className="mt-0.5 size-4 shrink-0 text-soft" />}
            {s.href && !s.done ? (
              <Link href={s.href} className="underline-offset-4 hover:underline">
                {s.label}
              </Link>
            ) : (
              <span className={s.done ? "text-soft line-through" : undefined}>{s.label}</span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
