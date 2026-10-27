/**
 * Sets up a Jollof Pages PocketBase:
 *   - the owner account (free studio access; its site is the publisher site at the root domain)
 *   - the publisher site settings (pen names are added in the studio, so the owner's own name
 *     never appears on the public site)
 *   - with --demo, four clearly marked sample books with covers, for trying the app out
 *
 * Usage:
 *   PB_URL=http://127.0.0.1:8090 PB_SUPERUSER_EMAIL=… PB_SUPERUSER_PASSWORD=… \
 *   OWNER_EMAIL=… OWNER_PASSWORD=… OWNER_NAME="Your Name" npx tsx scripts/seed.ts [--demo | --remove-demo]
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import PocketBase from "pocketbase";
import { PDFDocument } from "pdf-lib";
import { fillerChapter, fillerTitle, sampleChapters } from "../src/lib/sample-book";
import { buildTypst, typstString } from "../src/lib/export/typst";
import { countWords } from "../src/lib/doc/types";
import { DEFAULT_FORMAT, DEFAULT_GOAL, type Author, type Book, type Chapter } from "../src/lib/types";

const env = (k: string, d?: string) => {
  const v = process.env[k] ?? d;
  if (v === undefined) throw new Error(`Set ${k}`);
  return v;
};

const ROOT = path.resolve(__dirname, "..");
const TYPST = process.env.TYPST_BIN || (existsSync(path.join(ROOT, "tools/typst")) ? path.join(ROOT, "tools/typst") : "typst");
const FONTS = process.env.TYPST_FONT_PATH || path.join(ROOT, "fonts");

function typst(source: string, out: "png" | "pdf", ppi = 256): Buffer {
  const dir = mkdtempSync(path.join(tmpdir(), "jp-seed-"));
  try {
    writeFileSync(path.join(dir, "in.typ"), source);
    const target = path.join(dir, `out.${out}`);
    execFileSync(TYPST, ["compile", "--font-path", FONTS, ...(out === "png" ? ["--format", "png", "--ppi", String(ppi)] : []), path.join(dir, "in.typ"), target], { stdio: "pipe" });
    return readFileSync(target);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

interface CoverSpec {
  bg: string;
  fg: string;
  accent: string;
  font: string;
  style: "bold" | "framed" | "band";
}

/** A typographic 1600 x 2560 ebook cover, drawn with Typst. */
function cover(title: string, subtitle: string, author: string, c: CoverSpec): Buffer {
  const t = typstString;
  const body =
    c.style === "framed"
      ? `#rect(width: 100%, height: 100%, stroke: 3pt + rgb(${t(c.accent)}), inset: 0.45in)[
  #set align(center)
  #v(1.6in)
  #text(size: 50pt, weight: 700, tracking: -0.01em, hyphenate: false)[#${t(title)}]
  #v(0.25in)
  #line(length: 18%, stroke: 2pt + rgb(${t(c.accent)}))
  #v(0.25in)
  #text(size: 17pt, fill: rgb(${t(c.accent)}))[#${t(subtitle)}]
  #v(1fr)
  #text(size: 18pt, tracking: 0.12em)[#upper(${t(author)})]
  #v(0.3in)
]`
      : c.style === "band"
        ? `#place(top + left, dx: -0.6in, dy: -0.6in, rect(width: 6.25in, height: 5.6in, fill: rgb(${t(c.accent)})))
#place(top + left, dx: -0.6in, dy: -0.6in, rect(width: 6.25in, height: 5.6in, fill: tiling(size: (40pt, 40pt))[#place(circle(radius: 9pt, fill: rgb(${t(c.bg)}).transparentize(55%)))]))
#v(5.3in)
#text(size: 44pt, weight: 700, tracking: -0.02em, hyphenate: false)[#${t(title)}]
#v(0.18in)
#text(size: 16pt)[#${t(subtitle)}]
#v(1fr)
#text(size: 17pt, weight: 700, tracking: 0.1em)[#upper(${t(author)})]`
        : `#text(size: 70pt, weight: 700, tracking: -0.03em, hyphenate: false)[#par(leading: 0.25em)[#${t(title)}]]
#v(0.3in)
#text(size: 17pt, fill: rgb(${t(c.accent)}))[#${t(subtitle)}]
#v(1fr)
#text(size: 18pt, weight: 700, tracking: 0.1em)[#upper(${t(author)})]`;
  return typst(
    `#set page(width: 6.25in, height: 10in, margin: 0.6in, fill: rgb(${t(c.bg)}))
#set text(font: (${t(c.font)}, "Inter"), fill: rgb(${t(c.fg)}))
#set par(justify: false)
${body}
`,
    "png",
  );
}

/** A made-up pen name for the demo books. The older "Sample Author" is still removed by --remove-demo. */
const DEMO_AUTHOR = {
  name: "Tola Ekanem",
  slug: "tola-ekanem",
  bio: "Tola Ekanem is a made-up pen name for the demo books. Remove the demo books once your own are in.",
};
const DEMO_AUTHOR_SLUGS = [DEMO_AUTHOR.slug, "sample-author"];

const DEMO: { title: string; subtitle: string; pitch: string; description: string; trim: string; paper: "cream" | "white"; theme: string; upcoming?: boolean; featured?: boolean; cover: CoverSpec; categories: string[] }[] = [
  {
    title: "The Book Inside You",
    subtitle: "A practical guide to writing your first non-fiction book",
    pitch: "From a pile of ideas to a finished, published book, one chapter at a time.",
    description:
      "Sample book. This title and its text are placeholders that show how Jollof Pages presents a book. Replace them with your own.\n\nMost people who want to write a book never finish one. Not because they lack ideas, but because nobody showed them how a manuscript is actually built: who it is for, how the argument is shaped, and how to keep going when the middle sags.\n\nThis guide walks you from the promise your book makes to the day you hold the paperback.",
    trim: "6x9",
    paper: "cream",
    theme: "accra",
    featured: true,
    cover: { bg: "#ad3a17", fg: "#ffffff", accent: "#f2c14e", font: "Inter", style: "bold" },
    categories: ["Writing", "Self-publishing"],
  },
  {
    title: "Small Pot, Big Fire",
    subtitle: "Starting a business with what you already have",
    pitch: "A grounded guide to building something real without waiting for permission or capital.",
    description:
      "Sample book. This title and its text are placeholders that show how Jollof Pages presents a book. Replace them with your own.\n\nYou do not need a big pot to start cooking. This book is about the resources you already have and how to put heat under them.",
    trim: "5.5x8.5",
    paper: "white",
    theme: "uyo",
    cover: { bg: "#7a2e1d", fg: "#fff6ec", accent: "#f2c14e", font: "Inter", style: "band" },
    categories: ["Business", "Entrepreneurship"],
  },
  {
    title: "Owning Your Words",
    subtitle: "Self-publishing for African writers",
    pitch: "Rights, formats, ISBNs and stores, explained for writers publishing from Lagos to London.",
    description:
      "Sample book. This title and its text are placeholders that show how Jollof Pages presents a book. Replace them with your own.\n\nA plain-language guide to keeping control of your work: what rights you hold, which formats to publish in and how to reach readers at home and abroad.",
    trim: "6x9",
    paper: "cream",
    theme: "lagos",
    cover: { bg: "#2b2622", fg: "#f4efe6", accent: "#c9a45c", font: "Playfair Display", style: "framed" },
    categories: ["Publishing", "Writing"],
  },
  {
    title: "The Long Table",
    subtitle: "Essays on food, family and home",
    pitch: "What a shared meal teaches about patience, memory and the people we cook for.",
    description:
      "Sample book. This title and its text are placeholders that show how Jollof Pages presents a book. Replace them with your own.\n\nEssays gathered around the table: the meals that held a family together and the recipes that carried them across borders.",
    trim: "5x8",
    paper: "cream",
    theme: "dakar",
    upcoming: true,
    cover: { bg: "#1f4a6b", fg: "#ffffff", accent: "#e8b04b", font: "EB Garamond", style: "framed" },
    categories: ["Essays", "Food"],
  },
];

async function main() {
  const demo = process.argv.includes("--demo");
  const pb = new PocketBase(env("PB_URL", "http://127.0.0.1:8090"));
  pb.autoCancellation(false);
  await pb.collection("_superusers").authWithPassword(env("PB_SUPERUSER_EMAIL"), env("PB_SUPERUSER_PASSWORD"));

  const email = env("OWNER_EMAIL");
  const password = env("OWNER_PASSWORD");
  const name = env("OWNER_NAME", "Owner");
  const existing = await pb
    .collection("users")
    .getFirstListItem(pb.filter("email = {:e}", { e: email }))
    .catch(() => null);
  const owner = existing
    ? await pb.collection("users").update(existing.id, { password, passwordConfirm: password, name, verified: true, access: "comp" })
    : await pb.collection("users").create({ email, password, passwordConfirm: password, name, verified: true, emailVisibility: false, access: "comp" });
  console.log(`Owner: ${email}`);

  const sites = await pb.collection("site_settings").getFullList();
  if (!sites.length) {
    await pb.collection("site_settings").create({ owner: owner.id, publisher_name: "Jollof Pages", tagline: "", intro: "", about: "", socials: [], home: true });
    console.log("Site settings created");
  }

  if (process.argv.includes("--remove-demo")) {
    for (const slug of DEMO_AUTHOR_SLUGS) {
      const sample = await pb
        .collection("authors")
        .getFirstListItem<Author>(pb.filter("slug = {:s}", { s: slug }))
        .catch(() => null);
      if (!sample) continue;
      for (const b of await pb.collection("books").getFullList({ filter: pb.filter("author = {:a}", { a: sample.id }) })) await pb.collection("books").delete(b.id);
      await pb.collection("authors").delete(sample.id);
    }
    console.log("Demo books removed");
    return;
  }
  if (!demo) return;

  // demo books are credited to a made-up pen name, never to the owner
  let sampleAuthor = await pb
    .collection("authors")
    .getFirstListItem<Author>(pb.filter("slug = {:s}", { s: DEMO_AUTHOR.slug }))
    .catch(() => null);
  if (!sampleAuthor) sampleAuthor = await pb.collection("authors").create<Author>({ owner: owner.id, ...DEMO_AUTHOR });

  for (const [i, d] of DEMO.entries()) {
    const slug = d.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const existing = await pb
      .collection("books")
      .getFirstListItem<Book>(pb.filter("slug = {:s}", { s: slug }))
      .catch(() => null);
    if (existing) {
      console.log(`Skip ${d.title} (exists)`);
      continue;
    }
    const pubDate = new Date();
    pubDate.setMonth(pubDate.getMonth() + (d.upcoming ? 5 : -2 - i * 5));
    const form = new FormData();
    const fields: Record<string, unknown> = {
      owner: owner.id,
      author: sampleAuthor.id,
      title: d.title,
      subtitle: d.subtitle,
      slug,
      pitch: d.pitch,
      description: d.description,
      status: d.upcoming ? "editing" : "published",
      published: true,
      featured: !!d.featured,
      language: "en",
      imprint: "Jollof Pages",
      publication_date: pubDate.toISOString().replace("T", " "),
      format: { ...DEFAULT_FORMAT, trim: d.trim, paper: d.paper, theme: d.theme },
      goal: DEFAULT_GOAL,
      keywords: [],
      categories: d.categories,
      buy_links: [],
      accent: d.cover.bg,
      cover_design: null,
    };
    for (const [k, v] of Object.entries(fields)) form.append(k, typeof v === "object" && v !== null ? JSON.stringify(v) : String(v));
    form.append("cover", new Blob([new Uint8Array(cover(d.title, d.subtitle, DEMO_AUTHOR.name, d.cover))], { type: "image/png" }), `${slug}-cover.png`);
    const book = await pb.collection("books").create<Book>(form, { expand: "author" });

    const chapters: Chapter[] = [];
    const base = sampleChapters();
    const extra = Array.from({ length: 16 - i * 2 }, (_, k) => ({ ...base.find((c) => c.kind === "chapter")!, is_sample: false, subtitle: "", title: fillerTitle(k), order: 3 + k, content: fillerChapter(k) }));
    for (const c of [...base, ...extra]) {
      const content = c.content;
      const created = await pb.collection("chapters").create<Chapter>({ ...c, owner: owner.id, book: book.id, word_count: countWords(content), is_sample: c.is_sample && !d.upcoming });
      chapters.push(created);
    }
    // a real page count, from a real typeset interior
    const pdf = typst(buildTypst({ book, author: sampleAuthor, chapters, alsoBy: [] }, { pageCount: 100 }), "pdf");
    const pages = (await PDFDocument.load(pdf)).getPageCount();
    await pb.collection("books").update(book.id, { page_count: pages, word_count: chapters.reduce((s, c) => s + c.word_count, 0) });
    console.log(`Demo book: ${d.title} (${pages} pages)`);
  }
}

main().catch((e) => {
  console.error(e?.response ?? e);
  process.exit(1);
});
