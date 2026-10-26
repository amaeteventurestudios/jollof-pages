# Jollof Pages

A publisher and a writing studio in one app. The public site at the root shows the books; the
studio at `/studio` is where they are written, formatted for Amazon KDP, given covers and exported.

Built for practical non-fiction, in the spirit of Atticus, and self-hosted on your own server.

## What it does

**Writing**
- Books made of front matter, body and back matter elements (title page, copyright, dedication,
  contents, introduction, parts, chapters, acknowledgments, about the author and more), reordered by drag and drop.
- A focused editor (Tiptap) with headings, lists, quotes, callouts, footnotes, images, links,
  scene breaks, find and replace, and a sprint timer.
- Import a Word manuscript (`.docx`); it splits into chapters and keeps footnotes and images.
- Word goals with a deadline, a daily habit target, streaks and a year heatmap.

**Formatting**
- Five interior themes (Accra, Lagos, Uyo, Dakar, Nairobi) with a live Kindle, phone, tablet and print preview.
- KDP trim sizes: 5 x 8, 5.25 x 8, 5.5 x 8.5, 6 x 9, 6.14 x 9.21, 7 x 10, 8.5 x 11.
- Margins worked out for you: the gutter grows with the page count by KDP's table, outside
  margins clear KDP's minimums, and bleed is added when you turn it on.
- Chapters on the right-hand page, drop caps, running heads, roman front-matter numbers, large print.

**Export**
- Print PDF typeset with [Typst](https://typst.app): mirrored margins, real page numbers in the contents, blank versos.
- EPUB 3 with linked contents, an NCX for older readers and pop-up footnotes. A sample book passes EPUBCheck with no errors or warnings.
- DOCX for editors, the Typst source, and a JSON backup.

**Covers**
- Cover designer (Konva) with four layouts, saved as a 1600 x 2560 ebook cover.
- Full paperback wrap at 300 dpi as a PDF, sized from the page count and paper: spine width,
  bleed, safe area and the barcode box, with spine text allowed from 79 pages.

**Publisher site**
- Home page with the book "on stage" at its real proportions; its spine thickens with the page count.
- A page per book with buy links (Amazon, Okadabooks, Selar and more), a free sample chapter reader and structured data for search.
- Reader list sign-up (exported as CSV from the studio).

Uploading to KDP stays manual: download the PDF, EPUB and cover, then upload them in KDP.

## Stack

All permissively licensed (MIT, Apache-2.0, BSD, ISC, OFL fonts). `npm run licenses` checks the production dependencies.

| Part | Tool |
| --- | --- |
| Web app | Next.js 16, React 19, Tailwind CSS 4, Radix UI |
| Database, auth, files | PocketBase (self-hosted) |
| Editor | Tiptap (free extensions only) |
| Print PDF | Typst |
| Ebook | JSZip, validated with EPUBCheck |
| Word | mammoth (import), docx (export) |
| Covers | Konva, pdf-lib |
| 3D shelf on /books | Three.js, adapted from Mint Playground's [Complete Shelf](https://github.com/mintdotgg/mint-playground/tree/main/experiences/complete-shelf) (MIT, see `src/components/site/complete-shelf/LICENSE`) |
| Fonts | EB Garamond, Literata, Source Serif 4, Crimson Pro, Lora, Playfair Display, Inter, Archivo, Newsreader (SIL OFL) |

## Run it locally

Needs Node 22, and Java 11+ only if you want EPUBCheck.

```bash
npm install
npm run setup-tools                 # PocketBase, Typst, EPUBCheck and fonts into ./pocketbase, ./tools, ./fonts
cp .env.example .env.local          # then edit the passwords

./pocketbase/pocketbase superuser upsert admin@example.com change-me-please --dir pocketbase/pb_data
./pocketbase/pocketbase serve --dir pocketbase/pb_data --migrationsDir pocketbase/pb_migrations --automigrate=false

npm run seed                        # creates your studio login, site settings and author profile
npm run seed -- --demo              # optional: four sample books so the site is not empty
npm run dev                         # http://localhost:3000 and http://localhost:3000/studio
```

Remove the sample books with `npm run seed -- --remove-demo` once your own books are in.

## Deploy

See [docs/self-hosting.md](docs/self-hosting.md) for a single server on Hetzner, Contabo or
Oracle with Docker Compose and automatic HTTPS.

## Checks

```bash
npm run typecheck && npm run lint && npm test && npm run licenses
```
