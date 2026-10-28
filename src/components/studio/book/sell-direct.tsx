"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, Panel } from "./details-tab";
import { errorMessage, pb } from "@/lib/pb";
import { exportInput, fetchCover, fetchImages } from "@/lib/studio";
import { slugify } from "@/lib/slug";
import { useProStatus } from "../pro-panel";
import type { Book } from "@/lib/types";
import type { Workspace } from "./workspace";

const dollars = (c?: number) => (c ? (c / 100).toFixed(2) : "");

/** Sell the ebook from the author's own site: a price, the file readers get, and the switch. */
export function SellDirect({ ws }: { ws: Workspace }) {
  const { book } = ws;
  const { status } = useProStatus();
  const [price, setPrice] = useState(dollars(book.ebook_price_cents));
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  if (!status) return null;
  const ready = status.available && status.pro && status.payouts.ready;
  const cents = Math.round(Number(price.replace(/[^\d.]/g, "")) * 100);

  async function upload(file: Blob, name: string) {
    const form = new FormData();
    form.append("ebook_file", file, name);
    const saved = await pb().collection("books").update<Book>(book.id, form);
    await ws.saveBook({ ebook_file: saved.ebook_file });
  }
  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setMsg("");
    try {
      await fn();
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setBusy("");
    }
  }

  const build = () =>
    run("build", async () => {
      const input = await exportInput(book.id);
      const [{ buildEpub }, images, cover] = await Promise.all([import("@/lib/export/epub"), fetchImages(input), fetchCover(input.book)]);
      const bytes = await buildEpub(input, { images, cover });
      await upload(new Blob([bytes as BlobPart], { type: "application/epub+zip" }), `${slugify(book.title) || "book"}.epub`);
      setMsg("EPUB built from the book and saved. Rebuild it after you change the text.");
    });

  return (
    <Panel title="Sell the ebook yourself" description="Readers buy on your site and download the file straight away. The money goes to your own Stripe account; Jollof Pages keeps a small fee per sale.">
      {!ready ? (
        <p className="rounded-md bg-muted p-3 text-sm">
          {!status.available
            ? "Coming soon."
            : !status.pro
              ? "Part of Author Site Pro. "
              : "Set up payouts first, so Stripe knows where to pay you. "}
          {status.available && (
            <Link href="/studio/site" className="text-primary underline-offset-4 hover:underline">
              {status.pro ? "Set up payouts" : "See Pro"}
            </Link>
          )}
        </p>
      ) : (
        <>
          <Field id="sd-price" label="Ebook price, US dollars" hint="At least $1.">
            <Input
              id="sd-price"
              inputMode="decimal"
              className="max-w-32"
              placeholder="9.99"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={() => cents >= 100 && cents !== book.ebook_price_cents && ws.saveBook({ ebook_price_cents: cents })}
            />
          </Field>
          <div className="grid gap-2">
            <p className="text-sm font-medium">The file readers download</p>
            <p className="text-sm text-soft">{book.ebook_file ? `Saved: ${book.ebook_file}` : "Nothing yet. Build it from this book, or upload your own EPUB or PDF."}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" disabled={!!busy} onClick={build}>
                {busy === "build" ? "Building…" : book.ebook_file ? "Rebuild EPUB from the book" : "Build EPUB from the book"}
              </Button>
              <label className="inline-flex h-8 cursor-pointer items-center rounded-md border border-input bg-card px-3 text-sm hover:bg-muted">
                Upload a file
                <input
                  type="file"
                  accept=".epub,.pdf,application/epub+zip,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) run("upload", async () => (await upload(f, f.name), setMsg("File saved.")));
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-md bg-card p-4">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={!!book.sell_direct}
              disabled={!book.ebook_file || cents < 100}
              onChange={(e) => ws.saveBook({ sell_direct: e.target.checked, ...(cents >= 100 ? { ebook_price_cents: cents } : {}) })}
            />
            <span>
              <span className="block font-medium">Show &quot;Buy the ebook&quot; on the book&apos;s page</span>
              <span className="block text-sm text-soft">{book.sell_direct ? (book.published ? "On sale now." : "Goes on sale when the book is published.") : "Needs a price and a file."}</span>
            </span>
          </label>
        </>
      )}
      <p className="text-sm text-soft" role="status">
        {msg}
      </p>
    </Panel>
  );
}
