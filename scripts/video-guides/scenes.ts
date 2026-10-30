/**
 * What each video guide shows. A scene opens a studio page (not recorded), then plays out the
 * feature with captions. Keep captions short: one idea each, written for a new author.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Director } from "./director";

export interface Scene {
  start: string;
  /** where the poster frame comes from, as a share of the video (default 0.45) */
  poster?: number;
  setup?: (d: Director) => Promise<void>;
  run: (d: Director) => Promise<void>;
}

const FIXTURES = path.join(__dirname, "fixtures");
const BOOK = "The Long Table";

/** Opens a demo book's tab directly, without recording the trip there. */
async function openBook(d: Director, tab?: string, title = BOOK) {
  const href = await d.page.locator("a[href*=\"/studio/books/\"]", { hasText: title }).first().getAttribute("href");
  await d.goto(`${href}${tab ? `?tab=${tab}` : ""}`);
}

const btn = (d: Director, name: string | RegExp) => d.page.getByRole("button", { name, exact: typeof name === "string" }).first();
const dlg = (d: Director) => d.page.getByRole("dialog");
const link = (d: Director, name: string | RegExp) => d.page.getByRole("link", { name, exact: typeof name === "string" }).first();

export const SCENES: Record<string, Scene> = {
  tour: {
    start: "/studio",
    async run(d) {
      await d.say("Everything starts on the <b>Books</b> page: your books, today's words and your writing streak.");
      await d.ring(d.page.locator("nav[aria-label=Studio]"));
      await d.say("The bar along the top takes you to each part of the studio.");
      await d.ring(null);
      await d.click(link(d, "Pen names"));
      await d.say("<b>Pen names</b> holds the names you publish under.", 2000);
      await d.click(link(d, "Progress"));
      await d.say("<b>Progress</b> shows your streak and daily words.", 2000);
      await d.click(link(d, "Website"));
      await d.say("<b>Website</b> sets up your own author site.", 2000);
      await d.click(link(d, "Books"));
      await d.click(btn(d, /Account menu/));
      await d.say("Your account menu has light and dark mode, the AI assistant, help and these guides.");
      await d.click(d.page.getByText("Dark", { exact: true }).first(), { after: 1400 });
      await d.say("Dark mode is easier on the eyes at night. Choose <b>Match my device</b> to follow your computer.");
      await d.click(d.page.getByText("Light", { exact: true }).first(), { after: 900 });
      await d.press("Escape");
      await d.say("Stuck? <b>Help</b> and <b>Learn</b> are always in this menu.");
    },
  },

  "new-book": {
    start: "/studio",
    async run(d) {
      await d.say("To start a book, choose <b>New book</b>.", 1600);
      await d.click(btn(d, "New book"));
      await d.say("Give it a title. If you are stuck, describe the book and press <b>Suggest</b> for ideas.");
      await d.type(dlg(d).getByLabel("Title", { exact: true }), "The Pepper Soup Diaries");
      await d.type(dlg(d).getByLabel("Subtitle"), "Recipes and stories from my mother's kitchen");
      await d.say("Choose the pen name it is published under.", 1800);
      await d.point(dlg(d).getByLabel("Pen name"), { ring: true });
      await d.say("Leave this ticked to get a title page, copyright, contents and the other usual pages, ready to fill in.");
      await d.ring(null);
      await d.click(btn(d, "Create book"), { after: 2200 });
      await d.say("Your book opens on the Write tab, with the first chapter ready for you.");
    },
  },

  import: {
    start: "/studio",
    async run(d) {
      await d.say("Already wrote it somewhere else? Choose <b>Import Word or Markdown</b>.");
      await d.click(btn(d, "Import Word or Markdown"));
      await d.say("Word, Markdown (say, from ChatGPT), EPUB, RTF and plain text all work.");
      const chooser = d.page.waitForEvent("filechooser");
      await d.click(d.page.locator("#imp-file"), { after: 300 });
      await (await chooser).setFiles(path.join(FIXTURES, "market-days.md"));
      await d.say("Pick your file. The title fills in from its name, and you can change it.");
      await d.say("Each top heading becomes its own chapter. Bold, italic, lists, footnotes and images come across.");
      await d.click(btn(d, "Import"), { after: 3000 });
      await d.say("Here it is, split into chapters and ready to edit.");
    },
  },
  isbn: {
    start: "/studio",
    // Open Library is out of reach while recording, so the lookup answers with a made-up book
    async setup(d) {
      const cover = `data:image/jpeg;base64,${readFileSync(path.join(FIXTURES, "isbn-cover.jpg")).toString("base64")}`;
      await d.page.route("**/api/books/isbn**", (r) =>
        r.fulfill({
          json: {
            isbn: "9781234567897",
            title: "Rain on Zinc Roofs",
            subtitle: "Stories",
            authors: ["Tola Ekanem"],
            description: "Twelve stories of rainy seasons, crowded kitchens and the families who shelter under them.",
            publishDate: "2024-03-14",
            pages: 212,
            publisher: "Jollof Pages",
            cover,
          },
        }),
      );
    },
    async run(d) {
      await d.say("Already published a book elsewhere? You can still list it on your website.");
      await d.click(btn(d, "Add a published book"));
      await d.say("Type its ISBN and press <b>Look up</b>. The title, author, description and cover are filled in for you.");
      await d.type(dlg(d).getByLabel("ISBN"), "978-1-234-56789-7");
      await d.click(btn(d, "Look up"), { after: 3500 });
      await d.say("Check the details, then choose <b>Add to my website</b>. Nothing to retype.");
      await d.point(btn(d, "Add to my website"), { ring: true });
      await d.ring(null);
      await d.click(btn(d, "Cancel"));
    },
  },

  "pen-names": {
    start: "/studio/authors",
    async run(d) {
      await d.say("Publish under as many names as you like. Each one gets its own bio, photo and link.");
      await d.say("Paste your pen names here, one per line.", 1600);
      await d.type(d.page.getByLabel(/one per line/), "Adaeze Okafor\nKemi Adeyinka", { delay: 55 });
      await d.click(btn(d, "Add names"), { after: 1500 });
      await d.say("Each name now has a card. Add a short bio and a website, then <b>Save</b>.");
      const card = d.page.locator("h2", { hasText: "Adaeze Okafor" }).locator("xpath=ancestor::*[.//textarea][1]");
      await d.scrollTo(card);
      await d.type(card.locator("textarea").first(), "Adaeze writes warm, practical books about food and family.", { delay: 30 });
      await d.click(card.getByRole("button", { name: "Save" }), { after: 1200 });
      await d.say("When you start a book, pick the pen name it goes out under. Your own name never has to appear.");
    },
  },

  "box-set": {
    start: "/studio",
    async run(d) {
      await d.say("A box set bundles several of your books into one edition, ready to export and sell.");
      await d.click(btn(d, "Box set"));
      await d.say("Tick the books to include, in the order you want them.");
      for (const t of ["The Long Table", "Owning Your Words", "Small Pot, Big Fire"]) await d.click(dlg(d).getByText(t, { exact: true }), { after: 400 });
      await d.type(dlg(d).getByLabel("Title", { exact: true }), "The Kitchen Table Collection");
      await d.type(dlg(d).getByLabel("Subtitle"), "Books 1 to 3");
      await d.say("Create it, and each book becomes a part with its chapters inside. Format and export it like any other book.");
      await d.point(dlg(d).getByRole("button").filter({ hasText: /box set|Make|Create/ }).last(), { ring: true });
      await d.ring(null);
    },
  },

  chapters: {
    start: "/studio",
    setup: (d) => openBook(d),
    async run(d) {
      await d.say("The chapter list runs down the left: front matter, the body, then back matter.");
      await d.ring(d.page.getByRole("heading", { name: "Body" }));
      await d.ring(null);
      await d.say("To add a chapter, use <b>Add new chapter</b> at the foot of the list.", 2000);
      await d.click(btn(d, "Add new chapter"), { after: 1500 });
      await d.say("Give it a title, and start writing. It saves a moment after you stop typing.");
      await d.type(d.page.locator('input[aria-label="Title"]'), "Cooking for a crowd", { clear: true });
      await d.say("The <b>+</b> beside each section adds a part divider, a foreword, a glossary and more.");
      await d.click(btn(d, "Add to Body"), { after: 1600 });
      await d.press("Escape");
      await d.say("Drag the dotted handle to move a chapter. The numbers update by themselves.");
      await d.drag(btn(d, "Reorder Outline before you write"), btn(d, "Reorder Find the spine of the argument"));
      await d.say("Hide the list when you want more room to write.", 1800);
      await d.click(btn(d, "Hide chapters"), { after: 1400 });
      await d.click(btn(d, /Show chapters/), { after: 800 });
    },
  },

  toolbar: {
    start: "/studio",
    setup: (d) => openBook(d),
    async run(d) {
      await d.say("The toolbar above the page styles your text, the way it will print.");
      await d.selectText("Every book begins as a promise to a particular reader.");
      await d.say("Select some words, then choose <b>Bold</b> or <b>Italic</b>.", 1600);
      await d.click(btn(d, "Italic"), { after: 900 });
      await d.say("<b>Block quote</b> sets a passage apart. A <b>Callout box</b> frames a tip or a key idea.");
      await d.click(btn(d, "Callout box"), { after: 1400 });
      await d.click(btn(d, "Undo"), { after: 600 });
      await d.say("Choose a heading level from this list to break a chapter into sections.");
      await d.point(d.page.locator("select", { has: d.page.locator("option", { hasText: "Subheading" }) }).first(), { ring: true });
      await d.ring(null);
      await d.say("<b>Scene break</b>, <b>Link</b>, <b>Footnote</b> and <b>Image</b> are at the end of the bar.");
      await d.ring(btn(d, "Scene break"));
      await d.wait(700);
      await d.ring(btn(d, "Footnote"));
      await d.wait(900);
      await d.ring(null);
      await d.click(btn(d, "Undo"), { after: 500 });
    },
  },

  "chapter-settings": {
    start: "/studio",
    setup: (d) => openBook(d),
    async run(d) {
      await d.say("Above each chapter: its title, an optional subtitle, and its status.");
      await d.say("Mark a chapter <b>Draft</b>, <b>Revised</b> or <b>Final</b> to see what still needs work.");
      await d.click(d.page.getByLabel("Status"), { after: 400 });
      await d.page.getByLabel("Status").selectOption({ index: 1 });
      await d.wait(900);
      await d.say("The sliders icon opens this chapter's settings.");
      await d.click(btn(d, "Chapter settings").last(), { after: 1200 });
      await d.say("Hide the heading, page numbers or running head, use a smaller title, or leave it out of the contents.");
      await d.press("Escape", 800);
    },
  },

  "editor-settings": {
    start: "/studio",
    setup: (d) => openBook(d),
    async run(d) {
      await d.say("Make the page comfortable to write on. This only changes your screen, not the book.");
      await d.click(btn(d, "Editor settings"));
      await d.say("Pick a typeface and size you like reading.", 1600);
      await d.page.getByLabel("Font family").selectOption({ index: 2 });
      await d.wait(1000);
      const size = d.page.getByRole("slider").first();
      await d.point(size);
      await size.focus();
      for (let i = 0; i < 3; i++) await d.press("ArrowRight", 350);
      await d.say("Spaced or indented paragraphs, line height and justified text are here too.");
      await d.say("<b>Reset</b> brings back the defaults any time.", 1600);
      await d.click(btn(d, "Reset to default settings"), { after: 800 });
      await d.say("The eye icon above the page hides everything but your words.");
    },
  },

  "find-replace": {
    start: "/studio",
    setup: (d) => openBook(d),
    async run(d) {
      await d.say("<b>Find and replace</b> is on the tool rail to the right of the page.");
      await d.click(btn(d, "Find and replace"));
      await d.type(d.page.getByLabel("Find", { exact: true }), "reader");
      await d.say("Matches light up in the chapter. Step through them with the arrows.");
      await d.click(btn(d, "Next match"), { after: 700 });
      await d.click(btn(d, "Next match"), { after: 700 });
      await d.say("Switch to <b>Whole book</b> to search every chapter at once, with a count for each.");
      await d.click(d.page.getByText("Whole book", { exact: true }), { after: 1600 });
      await d.say("Type the new wording, then replace one at a time or all at once.");
      await d.type(d.page.getByLabel("Replace with"), "listener");
      await d.point(btn(d, /^Replace all/), { ring: true });
      await d.ring(null);
      await d.say("Tick <b>Match the whole word</b> or <b>Match case</b> to narrow it down.");
    },
  },

  "smart-quotes": {
    start: "/studio",
    setup: (d) => openBook(d),
    async run(d) {
      await d.say("Pasted text often brings straight quotes and double hyphens with it.");
      await d.click(btn(d, "Smart quotes"));
      await d.say("<b>Smart quotes</b> turns them into proper curly quotes and dashes, for one chapter or the whole book.");
      await d.click(d.page.getByText("Whole book", { exact: true }), { after: 900 });
      await d.say("<b>Inconsistencies</b> lists the chapters that still mix straight and curly quotes.");
      await d.click(d.page.getByText(/^Inconsistencies/), { after: 1400 });
      await d.say("Fix them all with one click.", 1500);
      await d.click(btn(d, "Fix them all"), { after: 1600 });
    },
  },

  sprint: {
    start: "/studio",
    setup: (d) => openBook(d),
    async run(d) {
      await d.say("A sprint is a short, timed burst of writing. Choose <b>Sprint</b> above the page.");
      await d.click(btn(d, "Sprint"));
      await d.click(d.page.getByText("15 minute sprint"), { after: 1500 });
      await d.say("The clock counts down while you write, and counts the words you add.");
      const p = d.page.locator(".ProseMirror p").first();
      await d.click(p, { after: 200 });
      await d.press("End", 200);
      await d.page.keyboard.type(" The table was set before anyone was hungry.", { delay: 55 });
      await d.wait(1500);
      await d.say("Your sprint words count toward today's total and your streak.");
    },
  },

  goals: {
    start: "/studio",
    setup: (d) => openBook(d, "goals"),
    async run(d) {
      await d.say("On the <b>Goals</b> tab, set how long the book should be and when you want it done.");
      await d.type(d.page.locator("input").first(), "80000", { clear: true });
      await d.say("The studio works out the words a day you need to finish on time.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Last 30 days" }));
      await d.say("The chart shows the words you wrote each day on this book.");
    },
  },

  progress: {
    start: "/studio/progress",
    async run(d) {
      await d.say("<b>Progress</b> shows your writing across every book.");
      await d.say("The year at a glance: each square is a day, darker for more words.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Last 30 days" }));
      await d.say("Your last 30 days, day by day.", 1800);
      await d.scrollTo(d.page.getByRole("heading", { name: "Books" }));
      await d.say("And how far each book is toward its goal.");
    },
  },

  assistant: {
    start: "/studio",
    setup: (d) => openBook(d),
    async run(d) {
      await d.say("The writing assistant uses the AI you choose: Claude, ChatGPT or OpenRouter.");
      await d.click(btn(d, "Writing assistant"));
      await d.click(btn(d, "Assistant settings"), { after: 800 });
      await d.say("Pick one and paste your own API key. You pay the provider directly, at their prices.");
      await d.click(d.page.getByText("Claude", { exact: true }).first(), { after: 500 });
      await d.type(d.page.getByLabel("Anthropic API key"), "sk-ant-demo-key-for-the-video-0000000000000", { delay: 20 });
      await d.ring(d.page.getByText("Remember between sessions"));
      await d.say("With <b>Remember between sessions</b> on, it keeps lasting facts about your book, so you don't repeat yourself.");
      await d.ring(null);
      await d.click(btn(d, "Save"), { after: 1600 });
      await d.say("Now ask about the chapter you have open, or pick a starting point like <b>Check consistency</b>.");
      await d.hush();
      await d.type(d.page.getByRole("textbox").last(), "How can I make the opening of this chapter stronger?", { delay: 30 });
      await d.press("Enter", 400);
      await d.say("It reads the chapter with you and answers in a few seconds.", 6500);
      await d.say("Ask follow-ups, or for a new draft of a paragraph. Nothing changes in your book unless you put it there.");
    },
  },

  preview: {
    start: "/studio",
    setup: (d) => openBook(d),
    async run(d) {
      await d.say("The preview beside the page shows the chapter exactly as it will print.");
      await d.ring(d.page.getByLabel("Preview device"));
      await d.say("Switch devices to see it as a paperback, a Kindle, a phone or a tablet.");
      await d.ring(null);
      const sel = d.page.getByLabel("Preview device");
      for (const i of [3, 5, 1]) {
        await d.point(sel);
        await sel.selectOption({ index: i });
        await d.wait(1600);
      }
      await d.say("Turn pages and chapters with the buttons underneath.", 1800);
      await d.click(btn(d, "Next page"), { after: 900 });
      await d.click(btn(d, "Next chapter"), { after: 1100 });
      await d.say("Drag the grip, or use the arrows on its edge, to make the preview wider or narrower.");
      await d.click(btn(d, "Make the preview wider"), { after: 1000 });
      await d.click(btn(d, "Make the preview narrower"), { after: 800 });
    },
  },

  "full-preview": {
    start: "/studio",
    setup: (d) => openBook(d),
    async run(d) {
      await d.say("To read the whole book the way a reader will, open <b>Full book preview</b>.");
      await d.click(btn(d, "Full book preview"), { after: 2200 });
      await d.say("Turn the pages like a printed book. Use the arrows or your keyboard.");
      for (let i = 0; i < 4; i++) await d.press("ArrowRight", 1100);
      await d.say("It is the best place to spot a stray blank page or an awkward break before you export.");
      await d.press("Escape", 800);
    },
  },

  invite: {
    start: "/studio/collaboration",
    async run(d) {
      await d.say("Invite people to work on a book with you. Each person gets one of three roles.");
      await d.click(btn(d, "Invite someone"));
      await d.say("Choose the book and type their email.", 1600);
      await dlg(d).getByLabel("Book").first().selectOption({ label: BOOK });
      await d.type(dlg(d).getByLabel("Email"), "editor@example.com");
      await d.say("A <b>co-writer</b> writes with you live. An <b>editor</b>'s changes arrive as tracked changes. A <b>commenter</b> only leaves notes.");
      await d.click(dlg(d).getByText("Editor", { exact: true }), { after: 800 });
      await d.type(dlg(d).getByLabel(/Personal note/), "Would love your eyes on the middle chapters.", { delay: 30 });
      await d.click(btn(d, "Send invitation"), { after: 1800 });
      await d.say("They get an email with a link. Collaborators are free and only see the books you share.");
    },
  },

  "track-changes": {
    start: "/studio",
    setup: (d) => openBook(d),
    async run(d) {
      await d.say("With track changes on, edits are kept as suggestions instead of changing the text straight away.");
      await d.click(btn(d, "Track changes"));
      await d.click(d.page.getByLabel(/Track my changes/), { after: 800 });
      await d.say("Edits from an editor arrive this way too. Here is one.");
      await d.selectText("particular");
      await d.page.keyboard.type("specific", { delay: 70 });
      await d.wait(1200);
      await d.say("Deleted words are struck through, new words are underlined, and each change is listed here.");
      await d.say("Accept or reject each change, or all of them at once.");
      const accept = d.page.getByRole("button", { name: /^Accept/ }).first();
      await d.click(accept, { after: 1200 });
      await d.click(d.page.getByLabel(/Track my changes/), { after: 600 });
    },
  },

  comments: {
    start: "/studio",
    setup: (d) => openBook(d),
    async run(d) {
      await d.say("Comments are notes pinned to a passage. They never print.");
      await d.click(btn(d, "Comments"));
      await d.say("Select some words in the chapter to comment on them.", 1600);
      await d.selectText("what keeps them up at night");
      await d.type(d.page.getByLabel("Comment", { exact: true }), "Can we give a real example here?", { delay: 35 });
      await d.click(d.page.getByRole("button", { name: "Comment", exact: true }), { after: 1400 });
      await d.say("The passage is highlighted. Anyone you invite can reply, and you resolve it when it is done.");
      await d.type(d.page.getByLabel("Reply").first(), "Good idea, adding my aunt's story.", { delay: 35 });
      await d.click(btn(d, "Send reply"), { after: 1200 });
    },
  },

  "cover-designer": {
    start: "/studio",
    setup: (d) => openBook(d, "cover"),
    async run(d) {
      await d.say("No designer yet? The <b>Cover</b> tab makes a clean typographic cover in a minute.");
      await d.say("Choose a layout.", 1200);
      for (const l of ["Framed", "Split", "Bold type"]) await d.click(btn(d, l), { after: 1100 });
      await d.say("Set the colours and the typeface.", 1500);
      await d.point(d.page.getByLabel("Typeface"));
      await d.page.getByLabel("Typeface").selectOption({ label: "Literata" });
      await d.wait(1200);
      await d.say("Drag the title and author to move them on the cover.");
      await d.say("Then <b>Save as ebook cover</b>. The <b>Paperback</b> tab builds the full wrap with spine and back.");
      await d.scrollTo(btn(d, "Save as ebook cover"));
      await d.point(btn(d, "Save as ebook cover"), { ring: true });
      await d.ring(null);
      await d.click(d.page.getByText("Paperback", { exact: true }), { after: 2200 });
    },
  },

  "cover-kit": {
    start: "/studio",
    setup: (d) => openBook(d, "cover"),
    async run(d) {
      await d.say("Made your art somewhere else, like ChatGPT or with a designer? Open <b>Paperback</b> and choose <b>Your artwork</b>.");
      await d.click(d.page.getByText("Paperback", { exact: true }), { after: 1200 });
      await d.click(btn(d, "Your artwork"), { after: 1400 });
      await d.scrollTo(d.page.locator("#kit-title"), "start");
      await d.say("The cover kit gives the exact sizes KDP needs for this book at 300 dpi, with prompts you can paste into your image tool.");
      await d.say("Download a wrap template sized to your page count, with the spine and safe areas marked.");
      await d.scrollTo(d.page.locator("#check-title"), "start");
      await d.say("Upload your art and the print check flags anything too small or off-size before KDP does.");
    },
  },


  "ai-cover": {
    start: "/studio",
    setup: (d) => openBook(d, "cover"),
    async run(d) {
      await d.say("Want a picture for your cover? Choose <b>Make artwork with AI</b>.");
      await d.click(btn(d, "Make artwork with AI"), { after: 1200 });
      await d.say("Pick a style, then describe the picture. <b>Ideas</b> suggests some from your book.");
      await d.click(btn(d, "Painting"), { after: 600 });
      const box = d.page.getByPlaceholder(/baobab/);
      await d.type(box, "A long wooden table at golden hour, crowded with steaming bowls, warm and inviting", { delay: 25 });
      await d.say("Drafts are quick and cheap for trying ideas. Print-ready 4K is large enough for a paperback.");
      await d.point(btn(d, /^Draft/), { ring: true });
      await d.ring(null);
      await d.say("The prompt is written for you from your book and your cover colours. Edit it freely.");
      await d.scrollTo(d.page.getByText("Prompt", { exact: true }));
      await d.say("Pictures use credits, bought as you go from $10. No subscription.");
    },
  },

  "chapter-images": {
    start: "/studio",
    setup: (d) => openBook(d),
    async run(d) {
      await d.say("Put a picture inside a chapter with the <b>Image</b> button.");
      await d.click(d.page.locator(".ProseMirror p").nth(1), { after: 300 });
      await d.press("End", 200);
      await d.click(btn(d, "Image"), { after: 1400 });
      await d.say("Pick from My images or upload a new one. Add a caption and alt text for e-readers.");
      await d.press("Escape", 600);
      await d.say("A chapter can also open with a picture. Find <b>Add chapter image</b> in the chapter's menu.");
      await d.click(btn(d, "Chapter settings").first(), { after: 1000 });
      await d.ring(d.page.getByText("Add chapter image…"));
      await d.wait(1200);
      await d.ring(null);
      await d.press("Escape", 500);
    },
  },

  images: {
    start: "/studio/images",
    async run(d) {
      await d.say("<b>My images</b> holds every picture across your books: covers, chapter art and uploads.");
      await d.say("Drop pictures here, or click to upload. JPG, PNG, WebP and GIF all work.");
      const chooser = d.page.waitForEvent("filechooser");
      await d.click(btn(d, "Upload images"), { after: 300 });
      await (await chooser).setFiles([path.join(FIXTURES, "table.jpg")]);
      await d.wait(2000);
      await d.say("Filter by book to find what you need. Any image here can go into a chapter or onto a cover.");
      await d.point(d.page.getByLabel("Show images from"), { ring: true });
      await d.ring(null);
    },
  },

  details: {
    start: "/studio",
    setup: (d) => openBook(d, "details"),
    async run(d) {
      await d.say("<b>Book details</b> holds what the stores and your website show about the book.");
      await d.say("Write a description, or press <b>Suggest</b> for drafts from the AI assistant.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Description" }));
      await d.say("Under Discovery, add up to seven keywords readers might search for, and your categories.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Discovery" }));
      await d.type(d.page.getByPlaceholder("Keyword 1"), "family food memoir", { clear: true });
      await d.say("Publishing holds the ISBNs, price and publication date. Then <b>Save changes</b>.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Publishing" }));
      await d.click(btn(d, "Save changes"), { after: 1200 });
    },
  },

  format: {
    start: "/studio",
    setup: (d) => openBook(d, "format"),
    async run(d) {
      await d.say("The <b>Format</b> tab sets how the printed book and ebook look.");
      await d.say("Pick an interior theme. Each one sets the fonts, chapter openings and ornaments.");
      for (const t of ["Lagos", "Nairobi", "Accra"]) await d.click(d.page.getByText(t, { exact: true }), { after: 1100 });
      await d.say("Choose a trim size. These are Amazon KDP's standard sizes.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Trim size" }));
      await d.click(d.page.getByText('6" x 9"', { exact: true }), { after: 900 });
      await d.say("Then the paper, the type size and the line spacing. The page count updates as you go.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Print specification" }));
      await d.say("The print specification lists the margins, gutter and spine width KDP will ask for.");
    },
  },

  hardcover: {
    start: "/studio",
    setup: (d) => openBook(d, "format"),
    async run(d) {
      await d.say("Selling a hardcover too? Turn on the hardcover edition.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Hardcover edition" }));
      const toggle = d.page.getByRole("heading", { name: "Hardcover edition" }).first().locator("xpath=following::input[1]");
      await d.click(toggle, { after: 1300 });
      await d.say("Pick a KDP case laminate trim. The studio adds the wider gutter a hardcover needs.");
      await d.say("Export then builds a separate hardcover PDF, and the Cover tab draws the wrap with its board and hinge.");
    },
  },

  export: {
    start: "/studio",
    setup: (d) => openBook(d, "export"),
    async run(d) {
      await d.say("When you are ready, the <b>Export</b> tab makes your files.");
      await d.say("<b>Build PDF</b> typesets the print interior for KDP or IngramSpark.", 2200);
      await d.click(btn(d, "Build PDF"), { after: 6000 });
      await d.say("<b>Download EPUB</b> gives the ebook, and <b>Check with EPUBCheck</b> confirms the stores will accept it.");
      await d.scrollTo(d.page.getByRole("heading", { name: /Ebook/ }));
      await d.say("A Word copy is handy for editors. Download a backup now and then; it holds the whole book.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Backup" }));
    },
  },

  kdp: {
    start: "/studio",
    setup: (d) => openBook(d, "publish"),
    async run(d) {
      await d.say("Publishing on Amazon? The <b>Publish</b> tab ends with a KDP checklist.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Amazon KDP checklist" }), "start");
      await d.say("It follows KDP's own forms, step by step, with your book's details ready to copy.");
      await d.scroll(400);
      await d.say("Tick each step as you go. <b>Open your KDP bookshelf</b> takes you straight there.");
      await d.point(link(d, "Open your KDP bookshelf"), { ring: true });
      await d.ring(null);
    },
  },

  "book-page": {
    start: "/studio",
    setup: (d) => openBook(d, "publish"),
    async run(d) {
      await d.say("Every book can have its own page on your website. Tick <b>Show this book on the website</b>.");
      await d.say("Choose a free sample chapter readers can read on the page.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Free sample" }));
      await d.say("Add a button for each store that sells it, with the price if you like.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Where to buy" }));
      await d.click(btn(d, "Add a store"), { after: 1200 });
      await d.say("Praise and reader reviews appear on the page too.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Praise" }));
    },
  },

  website: {
    start: "/studio/site",
    // the demo login owns the publisher's own site; show the page an ordinary author sees instead
    async setup(d) {
      await d.page.route("**/api/collections/site_settings/records**", async (r) => {
        const res = await r.fetch();
        const j = await res.json();
        for (const it of j.items ?? [j]) Object.assign(it, { home: false, subdomain: it.subdomain || "tolaekanem" });
        await r.fulfill({ response: res, json: j });
      });
      await d.goto("/studio/site");
    },
    async run(d) {
      await d.say("Every studio comes with a free author website. Set it up on the <b>Website</b> page.");
      await d.say("Your site lives at <b>yourname.jollofpages.com</b>. You can also connect a domain of your own.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Identity" }));
      await d.say("Name the site, add a tagline and choose which book leads the home page.");
      await d.scrollTo(d.page.getByRole("heading", { name: "About" }));
      await d.say("Write a short about page and add links to your social profiles.");
      await d.click(btn(d, "Save site"), { after: 1200 });
      await d.say("Then <b>Open the site</b> to see it as readers do.");
      await d.scrollTo(link(d, /Open the site/));
      await d.point(link(d, /Open the site/), { ring: true });
      await d.ring(null);
    },
  },

  readers: {
    start: "/studio/readers",
    async run(d) {
      await d.say("Readers who sign up on your website land on your list here.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Your list" }));
      await d.say("Write to them with a newsletter.", 1600);
      await d.scrollTo(d.page.getByRole("heading", { name: "Newsletters" }));
      await d.click(btn(d, "New newsletter"));
      await d.type(d.page.getByLabel("Subject"), "The Long Table is out today");
      await d.type(d.page.getByLabel("Letter"), "Dear reader,\n\nThe book is finally here, and I saved you a seat.", { delay: 30 });
      await d.say("<b>Send me a test</b> first, then send it to everyone on the list.");
      await d.point(btn(d, "Send me a test"), { ring: true });
      await d.ring(null);
    },
  },

  analytics: {
    start: "/studio/stats",
    async run(d) {
      await d.say("<b>Analytics</b> shows who visits your website. No cookies, and nothing about your readers is stored.");
      await d.click(btn(d, "90 days"), { after: 1200 });
      await d.say("Visitors and page views, day by day.", 1800);
      await d.scrollTo(d.page.getByRole("heading", { name: "Most-read pages" }));
      await d.say("Which pages people read, and where they came from.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Store clicks" }));
      await d.say("Which store buttons they clicked, and where readers signed up.");
    },
  },

  help: {
    start: "/studio/help",
    async run(d) {
      await d.say("Stuck? Search the common questions first.", 1600);
      await d.type(d.page.getByPlaceholder(/Search/), "gutter");
      await d.wait(1200);
      await d.say("Still stuck? Open a ticket. We answer within one working day.");
      await d.click(d.page.getByRole("link", { name: /Open a ticket/ }), { after: 900 });
      await d.type(d.page.getByPlaceholder(/blank page/), "How do I add a map before chapter one?", { delay: 30 });
      await d.say("Say what you were doing, and add a screenshot if you can.");
      await d.point(d.page.getByText("Add screenshots or a PDF"), { ring: true });
      await d.say("Our answers show up under <b>Your tickets</b>, with a copy by email.");
      await d.scrollTo(d.page.getByRole("heading", { name: "Your tickets" }));
    },
  },
};
