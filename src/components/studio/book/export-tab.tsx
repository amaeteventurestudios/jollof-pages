"use client";

import { useEffect, useState } from "react";
import { BookOpen, Download, FileCode2, FileText, FileType2, Loader2, ShieldCheck, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { download, exportInput, fetchCover, fetchImages } from "@/lib/studio";
import { pb } from "@/lib/pb";
import { slugify } from "@/lib/slug";
import { coverGeometry, inches } from "@/lib/kdp";
import { bookFormat } from "@/lib/types";
import type { Workspace } from "./workspace";

type Check = { ok: boolean; errors: number; warnings: number; messages: { severity: string; message: string; where: string }[] } | { error: string };

function Card({ icon: Icon, title, text, children }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col rounded-md bg-card p-5">
      <Icon className="size-5 text-primary" />
      <h2 className="mt-3 font-medium">{title}</h2>
      <p className="mt-1 flex-1 text-sm text-soft">{text}</p>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

export function ExportTab({ ws }: { ws: Workspace }) {
  const { book } = ws;
  const name = slugify(book.title);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const f = bookFormat(book);
  useEffect(() => () => void (pdfUrl && URL.revokeObjectURL(pdfUrl)), [pdfUrl]);

  async function guard(id: string, fn: () => Promise<void>) {
    setBusy(id);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function buildEpubBytes() {
    const input = await exportInput(book.id);
    const [{ buildEpub }, images, cover] = await Promise.all([import("@/lib/export/epub"), fetchImages(input), fetchCover(input.book)]);
    return buildEpub(input, { images, cover });
  }

  const epub = () =>
    guard("epub", async () => {
      download(await buildEpubBytes(), `${name}.epub`, "application/epub+zip");
      setMessage("EPUB downloaded. Upload it to KDP as your Kindle ebook manuscript.");
    });

  const validate = () =>
    guard("check", async () => {
      const bytes = await buildEpubBytes();
      const res = await fetch("/api/export/epubcheck", { method: "POST", headers: { Authorization: `Bearer ${pb().authStore.token}`, "Content-Type": "application/epub+zip" }, body: bytes as BodyInit });
      setCheck(await res.json());
    });

  const docx = () =>
    guard("docx", async () => {
      const input = await exportInput(book.id);
      const [{ buildDocx }, images] = await Promise.all([import("@/lib/export/docx"), fetchImages(input)]);
      const sized = new Map(
        await Promise.all(
          [...images].map(async ([src, img]) => {
            try {
              const bmp = await createImageBitmap(new Blob([img.bytes as BlobPart], { type: img.mediaType }));
              return [src, { ...img, width: bmp.width, height: bmp.height }] as const;
            } catch {
              return [src, img] as const;
            }
          }),
        ),
      );
      download(await buildDocx(input, sized), `${name}.docx`);
      setMessage("Word file downloaded. Word will ask to update the contents field when you open it.");
    });

  const pdf = (format: "pdf" | "typ") =>
    guard(format, async () => {
      const res = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { Authorization: `Bearer ${pb().authStore.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: book.id, format }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(`${j.error ?? "The PDF could not be built."}${j.detail ? `\n${j.detail}` : ""}`);
      }
      const pages = Number(res.headers.get("X-Page-Count") || 0);
      if (pages) ws.setBook((b) => (b ? { ...b, page_count: pages } : b));
      const blob = await res.blob();
      if (format === "typ") {
        download(blob, `${name}.typ`);
        setMessage("Typst source downloaded. Compile it with: typst compile --font-path fonts book.typ");
        return;
      }
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(URL.createObjectURL(blob));
      const cover = coverGeometry(f.trim, pages, f.paper);
      setMessage(`Print interior built: ${pages} pages. Your paperback cover needs a ${inches(cover.spine, 4)} spine, ${inches(cover.width)} x ${inches(cover.height)} in total.`);
    });

  const backup = () =>
    guard("backup", async () => {
      const input = await exportInput(book.id);
      download(new Blob([JSON.stringify({ app: "jollof-pages", version: 1, exported: new Date().toISOString(), ...input }, null, 2)], { type: "application/json" }), `${name}-backup.json`);
    });

  const spin = (id: string) => (busy === id ? <Loader2 className="animate-spin" /> : <Download />);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card icon={FileText} title="Print interior (PDF)" text={`Press-ready ${f.trim.replace("x", '" x ')}" PDF with mirrored margins, KDP gutter for the page count, running heads and a paged contents. Built with Typst.`}>
          <Button onClick={() => pdf("pdf")} disabled={!!busy}>
            {spin("pdf")} Build PDF
          </Button>
          {pdfUrl && (
            <Button variant="outline" asChild>
              <a href={pdfUrl} download={`${name}-interior.pdf`}>
                <Download /> Save PDF
              </a>
            </Button>
          )}
        </Card>
        <Card icon={BookOpen} title="Ebook (EPUB 3)" text="Reflowable EPUB with linked contents, popup footnotes and your cover. Works on Kindle (via KDP), Apple Books, Kobo and Google Play.">
          <Button onClick={epub} disabled={!!busy}>
            {spin("epub")} Download EPUB
          </Button>
          <Button variant="outline" onClick={validate} disabled={!!busy}>
            {busy === "check" ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Check with EPUBCheck
          </Button>
        </Card>
        <Card icon={FileType2} title="Word (DOCX)" text="A manuscript for editors and proofreaders, at your trim size with real footnotes and a contents field.">
          <Button onClick={docx} disabled={!!busy}>
            {spin("docx")} Download DOCX
          </Button>
        </Card>
        <Card icon={FileCode2} title="Typst source" text="The typesetting file behind the PDF, if you want to fine-tune a page by hand.">
          <Button variant="outline" onClick={() => pdf("typ")} disabled={!!busy}>
            {spin("typ")} Download .typ
          </Button>
        </Card>
        <Card icon={Archive} title="Backup" text="Everything about this book (text, settings and metadata) in one JSON file. Keep a copy somewhere safe.">
          <Button variant="outline" onClick={backup} disabled={!!busy}>
            {spin("backup")} Download backup
          </Button>
        </Card>
      </div>

      {message && (
        <p role="status" className="mt-6 rounded-md bg-primary-soft p-4 text-sm whitespace-pre-wrap text-ink">
          {message}
        </p>
      )}

      {check && (
        <section className="mt-6 rounded-md bg-card p-5" aria-live="polite">
          {"error" in check ? (
            <p className="text-sm text-destructive">{check.error}</p>
          ) : (
            <>
              <h2 className="font-medium">{check.ok ? "EPUBCheck passed" : "EPUBCheck found problems"}</h2>
              <p className="text-sm text-soft">
                {check.errors} errors, {check.warnings} warnings
              </p>
              {check.messages.length > 0 && (
                <ul className="mt-3 max-h-64 overflow-y-auto text-sm">
                  {check.messages.map((m, i) => (
                    <li key={i} className="border-t border-border py-1.5">
                      <span className={m.severity === "ERROR" || m.severity === "FATAL" ? "font-medium text-destructive" : "text-soft"}>{m.severity}</span> {m.message}{" "}
                      <span className="text-soft">{m.where}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      {pdfUrl && <iframe title="Print interior proof" src={pdfUrl} className="mt-6 h-[80vh] w-full rounded-md bg-card" />}
    </div>
  );
}
