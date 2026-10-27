"use client";

import JSZip from "jszip";
import { htmlToElements, type ImportedElement } from "./docx";
import { markdownToElements } from "./markdown";
import { plainTextToMarkdown, rtfToHtml, stripGutenberg } from "./text-formats";

type Upload = (blob: Blob, contentType: string) => Promise<string>;

/** Every manuscript the import accepts, for the file picker and for stripping the extension. */
export const IMPORT_ACCEPT = ".docx,.md,.markdown,.txt,.epub,.rtf,.odt,.html,.htm,.xhtml";
export const IMPORT_EXT = /\.(docx|md|markdown|txt|epub|rtf|odt|html?|xhtml)$/i;

const BLOCKS = new Set(["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "UL", "OL", "PRE", "HR", "IMG", "TABLE", "FIGURE"]);
const WRAPPERS = new Set(["DIV", "SECTION", "ARTICLE", "MAIN", "BODY", "HEADER", "FOOTER", "ASIDE", "HGROUP", "SPAN", "CENTER"]);

/**
 * Books from the web nest their chapters in <div> and <section> boxes. Lift every block out so the
 * shared splitter sees one flat run of headings and paragraphs.
 */
function flatten(root: Element): string {
  const out: string[] = [];
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (["SCRIPT", "STYLE", "NAV", "LINK", "META", "TITLE"].includes(child.tagName)) continue;
      if (child.tagName === "TABLE") {
        // tables become plain paragraphs, one per row
        child.querySelectorAll("tr").forEach((tr) => {
          const cells = Array.from(tr.children).map((c) => c.textContent?.trim()).filter(Boolean);
          if (cells.length) out.push(`<p>${cells.join(" · ")}</p>`);
        });
      } else if (child.tagName === "FIGURE") {
        child.querySelectorAll("img").forEach((img) => out.push(img.outerHTML));
        const cap = child.querySelector("figcaption")?.textContent?.trim();
        if (cap) out.push(`<p><em>${cap}</em></p>`);
      } else if (child.tagName === "HGROUP") {
        // "Chapter 1" over its title, as Standard Ebooks writes them, becomes one heading
        const h = child.querySelector("h1,h2,h3,h4,h5,h6");
        const rest = Array.from(child.children).filter((c) => c !== h).map((c) => c.textContent?.trim()).filter(Boolean);
        if (h) out.push(`<${h.tagName.toLowerCase()}>${[h.textContent?.trim(), ...rest].join(": ")}</${h.tagName.toLowerCase()}>`);
      } else if (BLOCKS.has(child.tagName)) out.push(child.outerHTML);
      else if (WRAPPERS.has(child.tagName) && child.children.length) walk(child);
      else if (child.textContent?.trim()) out.push(`<p>${child.innerHTML}</p>`);
    }
  };
  walk(root);
  return out.join("\n");
}

/** Old books mark chapter headings as "CHAPTER I." plus a title; tidy them into one line. */
function tidyHeadings(root: HTMLElement) {
  root.querySelectorAll("h1,h2,h3").forEach((h) => {
    h.innerHTML = h.innerHTML.replace(/\.?\s*<br\s*\/?>\s*/gi, ": ").replace(/\s+/g, " ").trim();
  });
}

/** A web page or a Gutenberg HTML book. */
export function htmlFileToElements(html: string): ImportedElement[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  // Gutenberg wraps its licence in sections marked pg-header and pg-footer
  doc.querySelectorAll("#pg-header, #pg-footer, section.pg-boilerplate, .pg-boilerplate").forEach((el) => el.remove());
  let body = flatten(doc.body);
  if (/START OF (THE|THIS) PROJECT GUTENBERG/i.test(body)) body = stripGutenberg(body).replace(/^[^<]*<\/p>/, "");
  return htmlToElements(body, tidyHeadings);
}

/** An RTF file, from WordPad, TextEdit or older word processors. */
export function rtfToElements(rtf: string): ImportedElement[] {
  return htmlToElements(rtfToHtml(rtf), tidyHeadings);
}

/** Plain text, including Gutenberg's .txt books. */
export function textToElements(text: string): ImportedElement[] {
  return markdownToElements(plainTextToMarkdown(text));
}

const dirOf = (path: string) => (path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "");
function resolvePath(base: string, rel: string): string {
  const parts = (dirOf(base) + decodeURIComponent(rel.split("#")[0])).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p && p !== ".") out.push(p);
  }
  return out.join("/");
}

/** Pages an ebook carries that are not part of the text: its cover, contents, colophon and so on. */
const SKIP_PAGE = /(^|[/_-])(cover|toc|nav|contents|titlepage|title-page|halftitle|colophon|imprint|uncopyright|copyright|loi|endnotes-nav|wrap)[^/]*\.x?html?$/i;

/** An EPUB ebook, such as one from Standard Ebooks or Project Gutenberg. Pictures are uploaded with `upload`. */
export async function epubToElements(buf: ArrayBuffer, upload?: Upload): Promise<ImportedElement[]> {
  const zip = await JSZip.loadAsync(buf);
  const parse = (xml: string, type: DOMParserSupportedType = "application/xml") => new DOMParser().parseFromString(xml, type);
  const container = await zip.file("META-INF/container.xml")?.async("string");
  if (!container) throw new Error("This EPUB has no container file.");
  const opfPath = parse(container).querySelector("rootfile")?.getAttribute("full-path");
  if (!opfPath) throw new Error("This EPUB does not say where its contents are.");
  const opf = parse((await zip.file(opfPath)?.async("string")) ?? "");
  const manifest = new Map<string, { href: string; type: string; props: string }>();
  opf.querySelectorAll("manifest > item").forEach((it) =>
    manifest.set(it.getAttribute("id") ?? "", { href: it.getAttribute("href") ?? "", type: it.getAttribute("media-type") ?? "", props: it.getAttribute("properties") ?? "" }),
  );

  const uploaded = new Map<string, string>();
  const parts: string[] = [];
  for (const ref of Array.from(opf.querySelectorAll("spine > itemref"))) {
    if (ref.getAttribute("linear") === "no") continue;
    const item = manifest.get(ref.getAttribute("idref") ?? "");
    if (!item || item.props.includes("nav") || !/html/.test(item.type)) continue;
    const path = resolvePath(opfPath, item.href);
    if (SKIP_PAGE.test(path)) continue;
    const xhtml = await zip.file(path)?.async("string");
    if (!xhtml) continue;
    const doc = parse(xhtml, "application/xhtml+xml");
    const body = doc.querySelector("body");
    if (!body) continue;
    for (const img of Array.from(body.querySelectorAll("img, image"))) {
      const src = img.getAttribute("src") ?? img.getAttribute("xlink:href") ?? img.getAttribute("href") ?? "";
      const file = zip.file(resolvePath(path, src));
      let url = "";
      if (file && upload) {
        const key = resolvePath(path, src);
        if (!uploaded.has(key)) {
          const ext = key.split(".").pop()?.toLowerCase() ?? "png";
          const type = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "svg" ? "image/svg+xml" : `image/${ext}`;
          uploaded.set(key, await upload(new Blob([await file.async("arraybuffer")], { type }), type).catch(() => ""));
        }
        url = uploaded.get(key) ?? "";
      }
      if (url) img.setAttribute("src", url);
      else img.remove();
    }
    // XHTML nodes do not carry upper-case tag names; move them into an HTML document first
    const html = parse(`<body>${new XMLSerializer().serializeToString(body).replace(/^<body[^>]*>|<\/body>$/g, "")}</body>`, "text/html");
    const flat = flatten(html.body);
    // a chapter file without its own heading still starts a new chapter
    parts.push(/<h[1-3][\s>]/i.test(flat) ? flat : `<h2>${doc.querySelector("title")?.textContent?.trim() || "Chapter"}</h2>${flat}`);
  }
  if (!parts.length) throw new Error("No readable chapters were found in this EPUB.");
  return htmlToElements(parts.join("\n"), tidyHeadings);
}

/** An OpenDocument text file, from LibreOffice or OpenOffice. */
export async function odtToElements(buf: ArrayBuffer, upload?: Upload): Promise<ImportedElement[]> {
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file("content.xml")?.async("string");
  if (!xml) throw new Error("This file has no text in it.");
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const styles = doc.querySelectorAll("style");
  // automatic styles that are bold or italic, by name
  const bold = new Set<string>();
  const italic = new Set<string>();
  const headingStyle = new Map<string, number>();
  styles.forEach((s) => {
    const name = s.getAttribute("style:name") ?? "";
    const tp = s.getElementsByTagName("style:text-properties")[0];
    if (tp?.getAttribute("fo:font-weight") === "bold") bold.add(name);
    if (tp?.getAttribute("fo:font-style") === "italic") italic.add(name);
    const parent = s.getAttribute("style:parent-style-name") ?? "";
    const m = parent.match(/^Heading_20_(\d)$/) ?? name.match(/^Heading_20_(\d)$/);
    if (m) headingStyle.set(name, Number(m[1]));
  });
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const inline = async (node: Node): Promise<string> => {
    let out = "";
    for (const c of Array.from(node.childNodes)) {
      if (c.nodeType === 3) out += esc(c.textContent ?? "");
      else if (c.nodeType === 1) {
        const el = c as Element;
        const tag = el.tagName;
        if (tag === "text:s") out += " ".repeat(Number(el.getAttribute("text:c") ?? 1));
        else if (tag === "text:tab") out += " ";
        else if (tag === "text:line-break") out += "<br>";
        else if (tag === "text:note") {
          const body = el.getElementsByTagName("text:note-body")[0];
          out += `<span data-footnote="" data-text="${esc(body?.textContent?.trim() ?? "").replace(/"/g, "&quot;")}"></span>`;
        } else if (tag === "draw:frame") {
          const href = el.getElementsByTagName("draw:image")[0]?.getAttribute("xlink:href");
          const file = href ? zip.file(href) : null;
          if (file && upload) {
            const ext = href!.split(".").pop()?.toLowerCase() ?? "png";
            const type = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
            const url = await upload(new Blob([await file.async("arraybuffer")], { type }), type).catch(() => "");
            if (url) out += `<img src="${url}">`;
          }
        } else {
          let inner = await inline(el);
          const st = el.getAttribute("text:style-name") ?? "";
          if (tag === "text:span" && bold.has(st)) inner = `<strong>${inner}</strong>`;
          if (tag === "text:span" && italic.has(st)) inner = `<em>${inner}</em>`;
          out += inner;
        }
      }
    }
    return out;
  };

  const out: string[] = [];
  const block = async (el: Element) => {
    for (const c of Array.from(el.children)) {
      if (c.tagName === "text:h") {
        const level = Math.min(Number(c.getAttribute("text:outline-level") ?? 1), 4);
        out.push(`<h${level}>${await inline(c)}</h${level}>`);
      } else if (c.tagName === "text:p") {
        const st = c.getAttribute("text:style-name") ?? "";
        const level = headingStyle.get(st);
        const html = await inline(c);
        if (level) out.push(`<h${level}>${html}</h${level}>`);
        else if (/^Quotations?$/.test(st)) out.push(`<blockquote><p>${html}</p></blockquote>`);
        else if (html.trim()) out.push(`<p>${html}</p>`);
        else if (html.includes("<img")) out.push(html);
      } else if (c.tagName === "text:list") {
        const items: string[] = [];
        for (const li of Array.from(c.getElementsByTagName("text:list-item"))) items.push(`<li>${await inline(li)}</li>`);
        out.push(`<ul>${items.join("")}</ul>`);
      } else if (c.tagName === "text:section" || c.tagName === "office:text") await block(c);
    }
  };
  const text = doc.getElementsByTagName("office:text")[0];
  if (text) await block(text);
  return htmlToElements(out.join("\n"));
}

/** Pick the reader for a file by its name. */
export async function fileToElements(file: File, upload?: Upload): Promise<ImportedElement[]> {
  const name = file.name.toLowerCase();
  if (/\.(md|markdown)$/.test(name)) return markdownToElements(await file.text());
  if (name.endsWith(".txt")) return textToElements(await file.text());
  if (name.endsWith(".epub")) return epubToElements(await file.arrayBuffer(), upload);
  if (name.endsWith(".odt")) return odtToElements(await file.arrayBuffer(), upload);
  if (name.endsWith(".rtf")) return rtfToElements(await file.text());
  if (/\.(html?|xhtml)$/.test(name)) return htmlFileToElements(await file.text());
  return (await import("./docx")).docxToElements(await file.arrayBuffer(), upload);
}
