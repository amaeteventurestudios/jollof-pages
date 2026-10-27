import type { Metadata } from "next";
import Link from "next/link";
import { getSite } from "@/lib/pb-server";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SpineCalculator } from "@/components/site/spine-calculator";
import { SubscribeForm } from "@/components/site/subscribe-form";
import { Pattern, Rim, type PatternKind } from "@/components/site/patterns";
import { Marquee } from "@/components/site/marquee";
import { Intro } from "@/components/site/intro";
import { InstallButton } from "@/components/pwa";
import { ScrollFx } from "@/components/marketing/scroll-fx";
import { Arrow, SectionHead, Shot, Star } from "@/components/marketing/parts";
import "@/components/marketing/marketing.css";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "Jollof Pages · Write, format and publish your book" },
  description: "The book studio for authors. Write your manuscript, format a KDP-ready paperback and ebook, design the cover and export files that pass first time. Novels, memoir, guides and more.",
};

/** The three things the studio does, each a panel that slides over the last. */
const PILLARS = [
  {
    id: "write",
    name: "Write",
    line: "A calm editor that thinks in chapters.",
    body: "Front matter, chapters and back matter in one list you reorder by dragging. Goals, sprints and a streak keep the book moving.",
    shot: { src: "editor", w: 2400, h: 1500, alt: "The Jollof Pages editor with the chapter list, a chapter open and a Kindle preview" },
    tone: "bg-jollof text-cream",
    pattern: { kind: "uli", color: "var(--char)", opacity: 0.17 },
  },
  {
    id: "format",
    name: "Format",
    line: "A real paperback and ebook, not a Word file.",
    body: "Pick an interior theme and a KDP trim size. Margins, gutter and bleed are worked out for you from the page count.",
    shot: { src: "format-dark", w: 2000, h: 1526, alt: "The Format tab in night mode: five interior themes, KDP trim sizes and the print specification" },
    tone: "bg-char text-cream",
    pattern: { kind: "aso", color: "var(--jollof)", opacity: 0.16 },
  },
  {
    id: "publish",
    name: "Publish",
    line: "Files Amazon accepts, and a page for every book.",
    body: "Export the print PDF, EPUB and cover wrap, upload them to KDP, then put the book on your free author website with a sample chapter.",
    shot: { src: "bookpage", w: 2200, h: 1375, alt: "A published book page with the 3D cover, description and buy links" },
    tone: "bg-bonnet text-char",
    pattern: { kind: "animals", color: "var(--jollof)", opacity: 0.13 },
  },
] satisfies { id: string; name: string; line: string; body: string; shot: object; tone: string; pattern: { kind: PatternKind; color: string; opacity: number } }[];

const EDITOR_STEPS = [
  {
    title: "Chapters you can drag",
    body: "Title page, copyright, dedication, contents, parts, chapters, acknowledgments and about the author. Drag any of them into place and the contents update themselves.",
    shot: { src: "editor", w: 2400, h: 1500, alt: "The editor with a chapter open and the chapter list on the left" },
  },
  {
    title: "Every tool a manuscript needs",
    body: "Headings, lists, quotes, callout boxes, footnotes, images, links and scene breaks. Find and replace across the whole book.",
    shot: { src: "editor-dark", w: 2400, h: 1500, alt: "The editor in night mode showing a callout box and a footnote" },
  },
  {
    title: "Goals that keep you going",
    body: "Set a target length and a finish date. The studio tells you the words you need each day, and a sprint timer helps you find them.",
    shot: { src: "progress", w: 2000, h: 1403, alt: "Writing progress: streak, words this year, a year heatmap and the last 30 days" },
  },
  {
    title: "Every book at a glance",
    body: "Your shelf shows every book, its stage and its word count. Today, the last seven days and your streak sit right on top.",
    shot: { src: "books", w: 2200, h: 1183, alt: "The studio shelf with four books, words today, last seven days and the writing streak" },
  },
];

const STEPS = [
  {
    name: "Bring in your manuscript",
    body: "Import a Word file or Markdown, even a draft you wrote with ChatGPT. Headings become chapters, and footnotes and images come with them.",
    kind: "import" as const,
  },
  {
    name: "Choose how it looks",
    body: "Five interior themes named for West African cities, seven KDP trim sizes, cream or white paper, body size and line spacing.",
    kind: "look" as const,
  },
  {
    name: "Preview it everywhere",
    body: "See the page on a Kindle, a phone, a tablet and in print as you write. What you see is what your reader gets.",
    kind: "devices" as const,
  },
];

const RULES = [
  { k: "Gutter", v: "Grows with the page count, by KDP's own table." },
  { k: "Margins", v: "Outside margins always clear KDP's minimums." },
  { k: "Spine", v: "Measured from your pages and paper, to the thousandth." },
  { k: "Bleed", v: "Added on all four sides the moment you turn it on." },
];

const FILES = [
  { name: "Print PDF", body: "Mirrored margins, running heads, page numbers in the contents, chapters on the right-hand page." },
  { name: "EPUB 3", body: "Linked contents and pop-up footnotes. Checked with EPUBCheck, the validator the stores use." },
  { name: "Cover wrap PDF", body: "Back, spine and front in one file at 300 dpi, with bleed and the barcode box in place." },
  { name: "Word", body: "A clean DOCX at your trim size for editors and proofreaders." },
];

const STORES = ["Amazon KDP", "Apple Books", "Kobo", "Google Play Books", "Barnes & Noble Press", "IngramSpark"];

const SAFE = [
  { k: "Saved as you type", v: "Every keystroke is stored. You never press save." },
  { k: "Private by default", v: "Nothing is public until you choose to publish it." },
  { k: "Yours to take", v: "Download a full backup or a Word file any time." },
  { k: "Any screen", v: "Desktop, laptop, tablet or phone, installed like an app." },
];

/** Atticus's column comes from its own published table on atticus.io (October 2026). */
const COMPARE: { row: string; us: string | boolean; them: string | boolean | null }[] = [
  { row: "Platforms", us: "Windows, Mac, Linux, Chromebook", them: "Windows, Mac, Linux, Chromebook" },
  { row: "Importing", us: "Word, EPUB, RTF, ODT, Markdown, HTML, text", them: "Word" },
  { row: "Exporting", us: "EPUB, PDF, DOCX", them: "EPUB, PDF, DOCX" },
  { row: "Parts and chapters", us: true, them: true },
  { row: "Footnotes", us: true, them: true },
  { row: "Callout boxes", us: true, them: true },
  { row: "Large print", us: true, them: true },
  { row: "Cloud storage and backups", us: true, them: true },
  { row: "Paperback cover wrap designer", us: true, them: null },
  { row: "KDP cover check before upload", us: true, them: null },
  { row: "Spine width worked out for you", us: true, them: null },
  { row: "Free author website (you.jollofpages.com)", us: true, them: null },
  { row: "A page for every book, with a free sample", us: true, them: null },
  { row: "Reader list sign-ups", us: true, them: null },
  { row: "Site design from your cover colours", us: true, them: null },
  { row: "Price, one time", us: "$119", them: "$147" },
];

/** Where "Buy" goes once Stripe is set up. Empty: the button joins early access instead. */
const CHECKOUT_URL = "";

const PLATFORMS = [
  { name: "Windows", how: "In Chrome or Edge, press Install in the address bar." },
  { name: "Mac", how: "In Safari choose File, then Add to Dock. Chrome works too." },
  { name: "Linux", how: "In Chrome or Chromium, press Install in the address bar." },
  { name: "Chromebook", how: "Press Install in the address bar and pin it to the shelf." },
  { name: "iPad", how: "In Safari tap Share, then Add to Home Screen." },
  { name: "Android", how: "In Chrome open the menu and tap Install app." },
];

/** Real words from real authors only. The section stays hidden until there are some. */
const TESTIMONIALS: { title: string; quote: string; name: string; role: string }[] = [];

const KINDS = [
  { name: "Novels", body: "Parts, scene breaks and classic chapter openings." },
  { name: "Memoir and essays", body: "Quiet book faces and generous margins." },
  { name: "How-to guides", body: "Steps, lists and callouts for exercises." },
  { name: "Business books", body: "Frameworks, quotes and clean headings." },
  { name: "Workbooks", body: "Room to write, large print and a clear contents." },
  { name: "Poetry", body: "Every line break kept, on screen and in print." },
]

const PLAN = [
  "Write, format and export unlimited books",
  "Unlimited pen names",
  "Print PDF, EPUB 3, Word and cover wrap exports",
  "Every interior theme and KDP trim size",
  "Cover designer and KDP cover check",
  "Free author website at you.jollofpages.com",
  "A page for every book, and a reader list",
  "Every update we ship, included",
];

const FAQ = [
  {
    q: "Do I need to be good with computers?",
    a: "No. If you can write an email you can make a book here. You type, pick a look from the menu and press export. There is no software to download: it installs straight from your browser.",
  },
  {
    q: "Does it work on a Mac, a PC or a tablet?",
    a: "Yes. Jollof Pages installs like an app from your browser on Windows, Mac, Linux, Chromebooks, iPads and Android tablets, and opens in its own window. You can even check a chapter on your phone.",
  },
  {
    q: "Can I write fiction with it?",
    a: "Yes. Novels, short stories, memoir and poetry all work. You get parts and chapters, scene breaks, drop caps, chapters that open on the right-hand page and classic book typefaces, the same as for non-fiction.",
  },
  {
    q: "Can I make both a paperback and an ebook?",
    a: "Yes, from the same text. Write once and export a print-ready PDF for the paperback and an EPUB for Kindle and every other ebook store.",
  },
  {
    q: "I wrote my draft in ChatGPT or Word. Can I bring it in?",
    a: "Yes. Import a Word document or Markdown, which is what ChatGPT writes, as well as EPUB, RTF, OpenDocument, web pages and plain text, including public-domain books from Project Gutenberg. Headings become chapters, and footnotes and images come across too.",
  },
  {
    q: "Will Amazon KDP accept the files?",
    a: "The files are built to KDP's published rules: trim sizes, gutter by page count, minimum margins, bleed, spine width and the 300 dpi cover. The cover check shows anything that would stop the upload before you get there.",
  },
  {
    q: "Does Jollof Pages upload the book to Amazon for me?",
    a: "Not yet. You download the interior PDF, the EPUB and the cover, then upload them in your own KDP account. It takes a few minutes and keeps your account in your hands.",
  },
  {
    q: "Is it a subscription?",
    a: "No. Jollof Pages is one payment of $119, with every future update included. AI cover credits are optional and pay as you go: $10 buys 100 credits, enough for about 25 print-ready covers, and credits never expire.",
  },
  {
    q: "What is the free author website?",
    a: "Every studio comes with a website at yourname.jollofpages.com. It shows your books, a page for each one with a free sample and buy links, and a sign-up form for your reader list, designed from your cover colours. Your own domain, like yourname.com, plus newsletters, direct ebook sales and analytics, will be part of Author Site Pro, coming soon at $10 a month or $96 a year with a free .com for the first year.",
  },
  {
    q: "Is there a limit on books or pen names?",
    a: "No. Write as many books as you like under as many pen names as you need.",
  },
  {
    q: "Who owns my book?",
    a: "You do, completely. We never claim rights to anything you write, and you can download all of it whenever you like.",
  },
  {
    q: "Can I use my own cover art?",
    a: "Yes. Upload a finished cover, or drop in artwork you made in ChatGPT, Nano Banana or anywhere else. The studio sizes it, adds the spine and back, and checks it against KDP.",
  },
];

export default async function Home() {
  const site = await getSite();

  return (
    <>
      <Intro name="Jollof Pages" />
      <SiteHeader name="Jollof Pages" overHero />
      <ScrollFx />

      {/* ---------- hero: the headline, then the studio itself lying down flat out of the red ---------- */}
      <section aria-labelledby="hero-title" className="hero relative overflow-hidden bg-jollof pt-[clamp(6.5rem,13vh,9rem)] text-cream" data-p="exit">
        <Pattern id="p-hero" kind="adire" color="var(--char)" opacity={0.16} />
        <div className="relative mx-auto max-w-[1600px] px-4 sm:px-8">
          <div className="head mx-auto max-w-[1440px] text-center">
            <h1 id="hero-title" className="hero-title wide font-bold">
              <span className="line">
                <span>Write.</span>
              </span>{" "}
              <span className="line">
                <span style={{ ["--i" as string]: 1 }}>Format.</span>
              </span>{" "}
              <span className="line">
                <span style={{ ["--i" as string]: 2 }}>Publish.</span>
              </span>
            </h1>
            <p className="fit fit-sub hero-sub mt-[1.1em]" style={{ ["--n" as string]: 44 }} data-rise>
              Create print books and ebooks in one studio.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3" data-rise style={{ ["--i" as string]: 2 }}>
              <a href="#early-access" className="btn">
                Get early access
                <Arrow />
              </a>
              <a href="#write" className="btn btn-ghost">
                See how it works
              </a>
            </div>
            <p className="t-small mt-5 text-cream/85" data-rise style={{ ["--i" as string]: 3 }}>
              Works in any browser on Mac, Windows, Chromebook and tablet.
            </p>
          </div>

          {/* the studio, tilted back like a page on a desk, lying flat as the page scrolls */}
          <div className="hero-stage relative mx-auto mt-[clamp(2rem,5vh,3.5rem)] max-w-[1320px]" data-rise style={{ ["--i" as string]: 3 }}>
            <div className="hero-tilt relative">
              <div className="frame">
                <Shot src="editor" w={2400} h={1500} alt="The Jollof Pages studio: chapter list, the editor and a live Kindle preview" eager />
              </div>
              {/* cut-outs that drift at their own speeds */}
              <div className="float-a absolute bottom-[-12%] -left-[4%] w-[17%] max-sm:hidden" aria-hidden>
                <Shot src="phone" w={592} h={1178} alt="" />
              </div>
              <div className="float-b absolute top-[16%] -right-[3%] w-[22%] max-sm:top-[40%] max-sm:-right-[2%] max-sm:w-[32%]" aria-hidden>
                <Shot src="kindle" w={675} h={908} alt="" />
              </div>
            </div>
          </div>
        </div>
        <div className="h-[clamp(4rem,10vw,8rem)]" />
        <Rim color="var(--char)" />
      </section>

      <Marquee
        items={["Word and Markdown import", "Seven KDP trim sizes", "Print PDF", "EPUB 3", "Paperback cover wrap", "Kindle preview", "Pen names", "Writing streaks"]}
        className="bg-char py-5 text-[clamp(1.125rem,1rem+1vw,1.75rem)] font-bold text-bonnet"
      />

      <main>
        {/* ---------- what it does: three panels that slide over one another ---------- */}
        <section aria-labelledby="pillars-title" className="relative bg-ground pt-[clamp(5rem,11vw,9rem)]">
          <div className="px-4 sm:px-8">
            <SectionHead id="pillars-title" title="Everything a book needs" sub="Write it, shape it and get it on the shelf." />
          </div>
          <div className="mt-[clamp(3rem,6vw,5rem)]">
            {PILLARS.map((p, i) => (
              <article key={p.id} id={p.id} className={`pillar ${p.tone}`} style={{ ["--z" as string]: i + 1 }} aria-labelledby={`${p.id}-name`}>
                <Pattern id={`p-${p.id}`} kind={p.pattern.kind} color={p.pattern.color} opacity={p.pattern.opacity} drift={false} />
                <div className="pillar-inner relative mx-auto grid h-full max-w-[1600px] items-center gap-6 px-4 py-[clamp(3rem,8vh,6rem)] sm:gap-8 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
                  <div className="head text-center lg:text-left">
                    <h3 id={`${p.id}-name`} className="fit fit-title pillar-name wide font-bold" style={{ ["--n" as string]: p.name.length }} data-reveal>
                      {p.name}
                    </h3>
                    <p className="t-lead mt-4 font-semibold" data-reveal style={{ ["--i" as string]: 1 }}>
                      {p.line}
                    </p>
                    <p className="mx-auto mt-4 max-w-[44ch] opacity-90 lg:mx-0" data-reveal style={{ ["--i" as string]: 2 }}>
                      {p.body}
                    </p>
                  </div>
                  <div className="cut" data-p="enter">
                    <Shot {...p.shot} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- the editor: the screenshot stays, the features scroll past it ---------- */}
        <section id="editor" aria-labelledby="editor-title" className="relative scroll-mt-16 bg-char py-[clamp(5rem,11vw,9rem)] text-cream">
          <Pattern id="p-editor" kind="wax" color="var(--char-2)" opacity={0.7} drift={false} />
          <div className="relative px-4 sm:px-8">
            <SectionHead id="editor-title" title="An editor built for books" sub="Chapters, goals and focus in one calm view." />
          </div>
          <div className="relative mx-auto mt-[clamp(3rem,6vw,5rem)] grid max-w-[1600px] gap-6 px-4 sm:px-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-14" data-steps>
            <div className="sticky top-28 z-10 self-start max-lg:hidden">
              <div className="stack relative bg-char">
                {EDITOR_STEPS.map((s, i) => (
                  <div key={s.title} className="stack-item" data-index={i}>
                    <Shot {...s.shot} />
                  </div>
                ))}
              </div>
            </div>
            <ol className="relative grid gap-4 lg:gap-0 lg:py-[14vh]">
              {EDITOR_STEPS.map((s, i) => (
                <li key={s.title} data-step className="step bg-char-2 p-4 pb-6 sm:p-6 lg:min-h-[50vh] lg:bg-transparent lg:p-0 lg:pt-6" style={{ ["--i" as string]: i }}>
                  <div className="cut mb-5 lg:hidden" data-p="enter">
                    <Shot {...s.shot} />
                  </div>
                  <h3 className="wide text-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] leading-[1.05] font-bold tracking-[-0.03em]">{s.title}</h3>
                  <p className="mt-3 max-w-[46ch] text-cream/90">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- formatting in three steps: a sideways track pinned while you scroll ---------- */}
        <section id="how" aria-labelledby="how-title" className="htrack relative scroll-mt-16 bg-ground" data-p="pin">
          <div className="htrack-sticky sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden pt-16">
            <div className="px-4 sm:px-8">
              <SectionHead id="how-title" title="Format in three steps" sub="Import it, pick a look and preview it everywhere." />
            </div>
            <div className="htrack-rail mt-[clamp(1.5rem,4vh,3rem)] flex gap-4 px-4 sm:gap-6 sm:px-8" data-track>
              {STEPS.map((s, i) => (
                <article key={s.name} className="panel flex shrink-0 flex-col overflow-hidden bg-cream-2 text-char" aria-labelledby={`step-${i}`}>
                  <div className="panel-art relative flex-1 overflow-hidden">
                    <StepArt kind={s.kind} />
                  </div>
                  <div className="p-5 sm:p-8">
                    <p className="font-bold text-jollof">{["First", "Then", "Last"][i]}</p>
                    <h3 id={`step-${i}`} className="wide mt-1 text-[clamp(1.25rem,1rem+1vw,2rem)] leading-[1.05] font-bold tracking-[-0.03em]">
                      {s.name}
                    </h3>
                    <p className="mt-2 max-w-[52ch]">{s.body}</p>
                  </div>
                </article>
              ))}
              <span className="w-px shrink-0 sm:w-2" aria-hidden />
            </div>
            <div className="htrack-bar mx-4 mt-6 h-1 bg-char/15 sm:mx-8" aria-hidden>
              <div className="h-full origin-left bg-jollof" />
            </div>
          </div>
        </section>

        {/* ---------- the live thing: KDP's rules, worked out in front of you ---------- */}
        <section id="kdp" aria-labelledby="kdp-title" className="relative scroll-mt-16 overflow-hidden bg-jollof py-[clamp(5rem,11vw,9rem)] text-cream">
          <Pattern id="p-kdp" kind="adire" color="var(--char)" opacity={0.14} />
          <div className="relative px-4 sm:px-8">
            <SectionHead id="kdp-title" title="Amazon's rules, done for you" sub="Slide the pages and watch the spine grow." />
          </div>
          <div className="relative mx-auto mt-[clamp(2.5rem,5vw,4rem)] max-w-[1400px] px-4 sm:px-8">
            <div data-reveal style={{ ["--i" as string]: 2 }}>
              <SpineCalculator book={null} />
            </div>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {RULES.map((r, i) => (
                <div key={r.k} className="rule bg-cream p-6 text-char" data-reveal style={{ ["--i" as string]: i }}>
                  <dt className="wide text-[1.5rem] font-bold tracking-[-0.03em]">{r.k}</dt>
                  <dd className="mt-2">{r.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------- covers: the wrap opens out of a slit ---------- */}
        <section id="covers" aria-labelledby="covers-title" className="relative scroll-mt-16 overflow-hidden bg-char py-[clamp(5rem,11vw,9rem)] text-cream">
          <div className="relative px-4 sm:px-8">
            <SectionHead id="covers-title" title="Covers sized to the pixel" sub="Ebook front and paperback wrap, at 300 dpi." />
          </div>
          <div className="relative mx-auto mt-[clamp(3rem,6vw,5rem)] max-w-[1400px] px-4 sm:px-8">
            <div className="slit" data-p="enter">
              <Shot src="cover-wrap" w={2200} h={1499} alt="The paperback wrap designer: back, spine and front with bleed, safe area and barcode guides" />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
              <div className="bg-cream" data-reveal>
                <Shot src="cover" w={2200} h={1095} alt="The ebook cover designer: layouts, colours, typeface and a live 1600 by 2560 cover" />
              </div>
              <ul className="grid content-start gap-5 bg-char-2 p-6 sm:p-8">
                {[
                  ["Bring your own art", "Made it in ChatGPT or Nano Banana? Drop it in. The studio gives you the exact sizes to ask for."],
                  ["Spine and back added", "The spine is sized from your page count and the back carries your description."],
                  ["Checked before KDP", "Page count, PDF size, spine text and artwork are checked against KDP's rules."],
                ].map(([k, v], i) => (
                  <li key={k} className="flex gap-4" data-reveal style={{ ["--i" as string]: i }}>
                    <Star className="mt-1.5 text-bonnet" />
                    <span>
                      <span className="block text-[1.25rem] font-bold">{k}</span>
                      <span className="text-cream/90">{v}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---------- export: the files, then the shops they go to ---------- */}
        <section id="export" aria-labelledby="export-title" className="relative scroll-mt-16 overflow-hidden bg-ground py-[clamp(5rem,11vw,9rem)]">
          <Pattern id="p-rice" kind="rice" color="var(--ground-2)" />
          <div className="relative px-4 sm:px-8">
            <SectionHead id="export-title" title="Files that pass first time" sub="Print PDF, EPUB 3 and Word, ready to upload." />
          </div>
          <div className="relative mx-auto mt-[clamp(3rem,6vw,5rem)] grid max-w-[1400px] gap-4 px-4 sm:px-8 lg:grid-cols-[1.3fr_1fr]">
            <div className="tilt-in self-start bg-white" data-p="enter">
              <Shot src="export" w={2000} h={968} alt="The Export tab: print interior PDF, EPUB 3, Word, Typst source and backup" />
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {FILES.map((f, i) => (
                <li key={f.name} className="file bg-char p-6 text-cream" data-reveal style={{ ["--i" as string]: i }}>
                  <span className="wide block text-[1.375rem] font-bold tracking-[-0.03em] text-bonnet">{f.name}</span>
                  <span className="mt-1 block text-cream/90">{f.body}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto mt-[clamp(3rem,6vw,5rem)] max-w-[1400px] px-4 text-center sm:px-8">
            <p className="text-[1.125rem] font-semibold" data-reveal>
              Upload the files to the stores you already sell in
            </p>
            <ul className="mt-5 flex flex-wrap justify-center gap-2" data-reveal style={{ ["--i" as string]: 1 }}>
              {STORES.map((s) => (
                <li key={s} className="store bg-char px-5 py-3 font-semibold text-cream">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- the book's home: a page per book, pen names ---------- */}
        <section id="site" aria-labelledby="site-title" className="relative scroll-mt-16 overflow-hidden bg-bonnet py-[clamp(5rem,11vw,9rem)] text-char">
          <Pattern id="p-weave" kind="weave" color="var(--jollof)" opacity={0.14} />
          <div className="relative px-4 sm:px-8">
            <SectionHead id="site-title" title="A home for every book" sub="A free author website comes with every studio." />
          </div>
          <div className="relative mx-auto mt-[clamp(3rem,6vw,5rem)] max-w-[1400px] px-4 sm:px-8">
            <div className="duo relative">
              <div className="duo-back" data-p="through">
                <Shot src="bookpage" w={2200} h={1375} alt="A book page on the publisher site with the cover in 3D, the description and a free chapter link" />
              </div>
              <div className="duo-front bg-white" data-p="through">
                <Shot src="authors" w={2000} h={1125} alt="Pen names in the studio: paste a list of names, each with a photo and biography" />
              </div>
            </div>
            <ul className="mt-[clamp(2rem,5vw,4rem)] grid gap-4 text-center sm:grid-cols-3">
              {[
                ["Your own website", "Every studio comes with a free site at you.jollofpages.com, styled from your cover colours."],
                ["Pen names", "Publish under as many names as you like. Your own stays private."],
                ["Reader list", "Readers sign up on your book pages. Export the list whenever you need it."],
              ].map(([k, v], i) => (
                <li key={k} className="bg-cream p-6" data-reveal style={{ ["--i" as string]: i }}>
                  <span className="wide block text-[1.375rem] font-bold tracking-[-0.03em]">{k}</span>
                  <span className="mt-1 block">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- safe and anywhere: three phones rising at their own pace ---------- */}
        <section id="safe" aria-labelledby="safe-title" className="relative scroll-mt-16 overflow-hidden bg-char py-[clamp(5rem,11vw,9rem)] text-cream">
          <Pattern id="p-safe" kind="pepper" color="var(--char-2)" opacity={0.9} drift={false} />
          <div className="relative px-4 sm:px-8">
            <SectionHead id="safe-title" title="Your words stay yours" sub="Saved as you type, and yours to take anywhere." />
          </div>
          <div className="relative mx-auto mt-[clamp(3rem,6vw,5rem)] grid max-w-[1400px] items-center gap-10 px-4 sm:px-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="phones flex justify-center gap-[3%] py-[6%]" data-p="through">
              {[
                { src: "m-books", alt: "The studio shelf on a phone" },
                { src: "m-write", alt: "The chapter list on a phone" },
                { src: "m-format", alt: "Interior themes on a phone" },
              ].map((m, i) => (
                <div key={m.src} className="phone w-[31%] max-w-[260px] bg-cream p-[1.2%]" style={{ ["--k" as string]: [1, -0.6, 1.4][i] }}>
                  <Shot src={m.src} w={780} h={1688} alt={m.alt} />
                </div>
              ))}
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              {SAFE.map((s, i) => (
                <div key={s.k} className="bg-char-2 p-6" data-reveal style={{ ["--i" as string]: i }}>
                  <dt className="text-[1.25rem] font-bold text-bonnet">{s.k}</dt>
                  <dd className="mt-1 text-cream/90">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ---------- anywhere: install it like an app ---------- */}
        <section id="anywhere" aria-labelledby="anywhere-title" className="relative scroll-mt-16 overflow-hidden bg-bonnet py-[clamp(5rem,11vw,9rem)] text-char">
          <Pattern id="p-anywhere" kind="nsibidi" color="var(--jollof)" opacity={0.16} drift={false} />
          <div className="relative px-4 sm:px-8">
            <SectionHead id="anywhere-title" title="Works on any computer" sub="Install it like an app on desktop or tablet." />
          </div>
          <div className="relative mx-auto mt-[clamp(3rem,6vw,5rem)] grid max-w-[1200px] items-center gap-10 px-4 sm:px-8 lg:grid-cols-[0.8fr_1.6fr]">
            <div className="flex flex-col items-center gap-6 text-center" data-reveal>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-512.png" alt="The Jollof Pages app icon" width={160} height={160} className="size-[clamp(7rem,12vw,10rem)] shadow-[12px_12px_0_var(--char)]" loading="lazy" />
              <p className="max-w-[30ch] text-[1.125rem]">It opens in its own window with its own icon, and your books stay safe in the cloud.</p>
              <InstallButton className="btn" label="Install the studio" />
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PLATFORMS.map((p, i) => (
                <li key={p.name} className="bg-char p-6 text-cream" data-reveal style={{ ["--i" as string]: i % 3 }}>
                  <p className="wide text-[1.5rem] font-bold text-bonnet">{p.name}</p>
                  <p className="mt-2 text-cream/90">{p.how}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- why: side by side with Atticus ---------- */}
        <section id="why" aria-labelledby="why-title" className="relative scroll-mt-16 bg-ground py-[clamp(5rem,11vw,9rem)]">
          <div className="px-4 sm:px-8">
            <SectionHead id="why-title" title="Why choose Jollof Pages" sub="Side by side with Atticus, row by row." />
          </div>
          <div className="mx-auto mt-[clamp(3rem,6vw,5rem)] max-w-[1100px] px-4 sm:px-8" data-reveal>
            <table className="compare w-full text-left">
              <caption className="sr-only">Jollof Pages compared with Atticus</caption>
              <thead>
                <tr className="bg-char text-cream">
                  <th scope="col" className="p-3 sm:p-5">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col" className="bg-jollof p-3 text-center font-bold sm:p-5">
                    Jollof Pages
                  </th>
                  <th scope="col" className="p-3 text-center font-semibold sm:p-5">
                    Atticus
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((c) => (
                  <tr key={c.row} className="compare-row">
                    <th scope="row" className="p-3 font-semibold sm:p-5">
                      {c.row}
                    </th>
                    <td className="compare-us p-3 text-center font-semibold sm:p-5">
                      <Cell v={c.us} />
                    </td>
                    <td className="p-3 text-center sm:p-5">
                      <Cell v={c.them} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="t-small mt-4 text-center text-char/75">Atticus details are taken from the comparison table on atticus.io in October 2026. A dash means the feature is not listed there.</p>
          </div>
        </section>

        {/* ---------- every kind of book: rows that fill as the pointer passes ---------- */}
        <section id="made-for" aria-labelledby="kinds-title" className="relative scroll-mt-16 overflow-hidden bg-jollof py-[clamp(5rem,11vw,9rem)] text-cream">
          <Pattern id="p-kinds" kind="adire" color="var(--char)" opacity={0.12} drift={false} />
          <div className="relative px-4 sm:px-8">
            <SectionHead id="kinds-title" title="Made for every kind of book" sub="Novels, memoir, guides, workbooks and poetry." />
          </div>
          <ul className="relative mx-auto mt-[clamp(3rem,6vw,5rem)] max-w-[1400px] px-4 sm:px-8">
            {KINDS.map((k, i) => (
              <li key={k.name} className="kind" data-reveal style={{ ["--i" as string]: i % 3 }}>
                <span className="wide kind-name font-bold">{k.name}</span>
                <span className="kind-body">{k.body}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- price ---------- */}
        <section id="pricing" aria-labelledby="pricing-title" className="relative scroll-mt-16 overflow-hidden bg-ground py-[clamp(5rem,11vw,9rem)]">
          <div className="px-4 sm:px-8">
            <SectionHead id="pricing-title" title="Pay once, own it" sub="One price, every book, every update." />
          </div>
          <div className="mx-auto mt-[clamp(3rem,6vw,5rem)] grid max-w-[1100px] gap-4 px-4 sm:px-8">
            <div className="plan grid overflow-hidden bg-char text-cream lg:grid-cols-[1fr_1.1fr]" data-reveal>
              <div className="relative overflow-hidden bg-jollof p-8 sm:p-12">
                <Pattern id="p-plan" kind="adire" color="var(--char)" opacity={0.18} drift={false} />
                <div className="relative">
                  <p className="text-[1.25rem] font-semibold">Jollof Pages Studio</p>
                  <p className="wide mt-3 text-[clamp(4.5rem,3rem+6vw,8rem)] leading-[0.85] font-bold tracking-[-0.05em]">$119</p>
                  <p className="mt-4 text-[1.125rem] font-semibold">One-time payment. No monthly fees.</p>
                  <p className="mt-3 max-w-[34ch] text-cream/95">Buy it once and write as many books as you like, with every update we ship included.</p>
                  <a href={CHECKOUT_URL || "#early-access"} className="btn mt-8">
                    {CHECKOUT_URL ? "Buy Jollof Pages" : "Join early access"}
                    <Arrow />
                  </a>
                </div>
              </div>
              <ul className="grid content-center gap-4 p-8 sm:p-12">
                {PLAN.map((p, i) => (
                  <li key={p} className="flex items-start gap-3 text-[1.125rem]" data-reveal style={{ ["--i" as string]: i }}>
                    <Check className="mt-1 text-bonnet" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-start justify-between gap-4 bg-bonnet p-6 text-char sm:flex-row sm:items-center sm:p-8" data-reveal>
              <div>
                <p className="text-[0.875rem] font-bold tracking-[0.12em] uppercase">Add-on, coming soon</p>
                <p className="wide mt-1 text-[1.5rem] font-bold">AI cover credits</p>
                <p className="mt-1 max-w-[52ch]">Make cover art in your book&apos;s own colours, right inside the studio. $10 buys 100 credits: about 50 drafts or 25 print-ready covers. Credits never expire.</p>
              </div>
              <Star className="size-12 shrink-0 text-jollof" />
            </div>
            <div className="flex flex-col items-start justify-between gap-4 border-2 border-char/15 bg-cream p-6 text-char sm:flex-row sm:items-center sm:p-8" data-reveal>
              <div>
                <p className="text-[0.875rem] font-bold tracking-[0.12em] uppercase">Upgrade, coming soon</p>
                <p className="wide mt-1 text-[1.5rem] font-bold">Author Site Pro</p>
                <p className="mt-1 max-w-[52ch]">Your author website on your own domain, like yourname.com, plus newsletters, direct ebook sales and analytics. $10 a month, or $96 a year with a free .com for the first year.</p>
              </div>
              <Star className="size-12 shrink-0 text-jollof" />
            </div>
          </div>
        </section>

        {TESTIMONIALS.length > 0 && (
          <section id="authors" aria-labelledby="authors-title" className="relative scroll-mt-16 overflow-hidden bg-char py-[clamp(5rem,11vw,9rem)] text-cream">
            <div className="relative px-4 sm:px-8">
              <SectionHead id="authors-title" title="Authors love it" sub="In their own words." />
            </div>
            <ul className="relative mx-auto mt-[clamp(3rem,6vw,5rem)] grid max-w-[1200px] gap-4 px-4 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
              {TESTIMONIALS.map((t, i) => (
                <li key={t.name} className="flex flex-col bg-char-2 p-7" data-reveal style={{ ["--i" as string]: i % 3 }}>
                  <p className="text-[1.25rem] font-bold text-bonnet">{t.title}</p>
                  <blockquote className="mt-3 flex-1 text-cream/90">&ldquo;{t.quote}&rdquo;</blockquote>
                  <p className="mt-6 font-semibold">{t.name}</p>
                  <p className="t-small text-cream/70">{t.role}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ---------- questions ---------- */}
        <section id="faq" aria-labelledby="faq-title" className="relative scroll-mt-16 bg-ground-2 py-[clamp(5rem,11vw,9rem)]">
          <div className="px-4 sm:px-8">
            <SectionHead id="faq-title" title="Questions, answered" sub="What authors ask before they start a book." />
          </div>
          <div className="mx-auto mt-[clamp(3rem,6vw,5rem)] grid max-w-[900px] gap-2 px-4 sm:px-8">
            {FAQ.map((f, i) => (
              <details key={f.q} name="faq" className="faq bg-ground" data-reveal style={{ ["--i" as string]: i % 4 }}>
                <summary className="flex min-h-[4.5rem] cursor-pointer list-none items-center justify-between gap-6 px-5 py-4 text-[1.125rem] font-semibold sm:px-7 sm:text-[1.25rem]">
                  {f.q}
                  <span className="plus relative size-4 shrink-0" aria-hidden>
                    <span className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-current" />
                    <span className="plus-v absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-current" />
                  </span>
                </summary>
                <div className="px-5 pb-6 sm:px-7">
                  <p className="max-w-[60ch]">{f.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ---------- the close: a blank book opens behind the sign-up ---------- */}
        <section id="early-access" aria-labelledby="cta-title" className="cta relative scroll-mt-16 overflow-hidden bg-jollof py-[clamp(6rem,13vw,11rem)] text-cream" data-p="through">
          <Pattern id="p-cta" kind="adire" color="var(--char)" opacity={0.2} />
          {/* a blank book whose pages fan open as the section passes */}
          <div className="cta-book absolute top-1/2 left-1/2 aspect-[2/3] w-[min(72vw,480px)]" aria-hidden>
            <span className="cta-page bg-cream-2" style={{ ["--r" as string]: "-26deg" }} />
            <span className="cta-page bg-bonnet" style={{ ["--r" as string]: "-14deg" }} />
            <span className="cta-page bg-char" style={{ ["--r" as string]: "6deg" }} />
          </div>
          <div className="relative px-4 sm:px-8">
            <SectionHead id="cta-title" title="Your book is ready to cook" sub="Join early access and be first in the kitchen." />
            <div className="mx-auto mt-8 max-w-[560px]" data-reveal style={{ ["--i" as string]: 2 }}>
              <SubscribeForm source="early-access" tone="dark" button="Join" done="You are on the early-access list. We will email you when your seat is ready." />
              <p className="t-small mt-4 text-center text-cream/85">
                One email when your access is ready. See our{" "}
                <Link href="/privacy" className="link underline">
                  privacy policy
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter name="Jollof Pages" email={site?.email} />
    </>
  );
}

function Cell({ v }: { v: string | boolean | null }) {
  if (v === true)
    return (
      <>
        <Check className="inline-block align-middle" />
        <span className="sr-only">Yes</span>
      </>
    );
  if (v === null || v === false)
    return (
      <>
        <span aria-hidden>—</span>
        <span className="sr-only">Not listed</span>
      </>
    );
  return <>{v}</>;
}

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-5 shrink-0 ${className ?? ""}`} aria-hidden>
      <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

/** The picture at the top of each formatting step, made from real studio screenshots. */
function StepArt({ kind }: { kind: "import" | "look" | "devices" }) {
  if (kind === "import")
    return (
      <div className="absolute inset-0 bg-char">
        <div className="step-shot absolute top-[8%] left-[6%] w-[125%]">
          <Shot src="books" w={2200} h={1183} alt="The studio shelf with the Import Word or Markdown button and four books" />
        </div>
      </div>
    );
  if (kind === "look")
    return (
      <div className="absolute inset-0 bg-jollof">
        <div className="step-shot absolute top-[8%] left-[6%] w-[112%]">
          <Shot src="format" w={2000} h={1526} alt="Five interior themes, Accra, Lagos, Uyo, Dakar and Nairobi, with KDP trim sizes" />
        </div>
      </div>
    );
  return (
    <div className="absolute inset-0 flex items-end justify-center gap-[4%] bg-bonnet px-[6%] pt-[6%]">
      <div className="w-[34%] translate-y-[8%]">
        <Shot src="kindle" w={675} h={908} alt="A chapter on a Kindle" />
      </div>
      <div className="w-[24%] translate-y-[16%]">
        <Shot src="phone" w={592} h={1178} alt="The same chapter on a phone" />
      </div>
      <div className="w-[36%] translate-y-[4%]">
        <Shot src="tablet" w={736} h={977} alt="The same chapter on a tablet" />
      </div>
    </div>
  );
}
