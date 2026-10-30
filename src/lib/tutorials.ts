/** Step-by-step guides for the Learn page and the dashboard card. */

export interface Tutorial {
  id: string;
  title: string;
  summary: string;
  minutes: number;
  /** where in the studio to try it; "book" means inside any book */
  where: string;
  steps: { title: string; text: string }[];
  tip?: string;
}

export const TUTORIALS: Tutorial[] = [
  {
    id: "first-book",
    title: "Start your first book",
    summary: "Create a book, or bring in a manuscript you already wrote.",
    minutes: 3,
    where: "Books page",
    steps: [
      { title: "Create the book", text: "On the Books page, choose New book. Give it a title and, if you like, a subtitle and pen name. Keep the box ticked that adds the title page, copyright, contents and the other usual pages, ready to fill in." },
      { title: "Or import a manuscript", text: "Choose Import Word or Markdown instead and pick your file. Each top-level heading becomes a chapter. Bold, italic, lists, footnotes and images come across." },
      { title: "Set a goal", text: "On the book's Goals tab, set a target word count and a deadline. Your daily words and streak then appear on the Books page and the Progress page." },
    ],
    tip: "Already published elsewhere? Add a published book from its ISBN to list it on your website without retyping it.",
  },
  {
    id: "write",
    title: "Write and organise chapters",
    summary: "Chapters, front and back matter, reordering and autosave.",
    minutes: 4,
    where: "Write tab",
    steps: [
      { title: "Add chapters", text: "Use the Add new chapter button at the foot of the chapter list. Front matter (foreword, preface, epigraph) and back matter (acknowledgments, glossary, notes) are under the + beside each section." },
      { title: "Reorder", text: "Drag the dotted handle at the left of a row. Chapter numbers update by themselves." },
      { title: "Style as you write", text: "The toolbar sets headings, bold and italic, block quotes, callouts, lists, scene breaks, links, footnotes and images. Mark each chapter Draft, Revised or Final from the menu beside its title." },
      { title: "Let it save", text: "Your work saves a moment after you stop typing. The book header shows \"All changes saved\"." },
    ],
  },
  {
    id: "tools",
    title: "Find, replace and fix quotes",
    summary: "The tool rail: editor settings, find and replace, smart quotes.",
    minutes: 3,
    where: "Write tab",
    steps: [
      { title: "Make the editor comfortable", text: "Open the Aa icon on the right-hand rail. Pick a writing font, size and line spacing, indented or spaced paragraphs, and justified text. This only changes your writing view, never the book." },
      { title: "Find and replace", text: "Open the search icon or press Ctrl+F (Cmd+F on a Mac). Search this chapter or the whole book, with Match case and Whole word. Replace one at a time or all at once." },
      { title: "Fix straight quotes", text: "Open the quote icon. Inconsistencies lists every chapter that still has straight quotes. Apply turns them all into curly quotes and apostrophes." },
    ],
  },
  {
    id: "chapter-settings",
    title: "Chapter images and settings",
    summary: "Opening images, hidden headings, page numbers and running heads.",
    minutes: 3,
    where: "Write tab",
    steps: [
      { title: "Open Chapter settings", text: "Click the sliders icon to the right of the chapter title." },
      { title: "Add a chapter image", text: "Choose Add chapter image and pick from My images or upload one. Wide pictures work best. Turn on White title over the image for a full-width opener with the title set over it." },
      { title: "Hide what you don't need", text: "Hide the chapter heading, page numbers or running head for a page, use a smaller title, or leave the chapter out of the table of contents." },
    ],
  },
  {
    id: "format",
    title: "Format your interior",
    summary: "Themes, trim size, fonts and the finishing touches of a printed book.",
    minutes: 4,
    where: "Format tab",
    steps: [
      { title: "Choose a theme", text: "Each theme sets the fonts, chapter openings and scene breaks for both the print book and the ebook. Switch freely; nothing in your text changes." },
      { title: "Pick a trim size", text: "6\" x 9\" suits most non-fiction, 5\" x 8\" or 5.5\" x 8.5\" most novels. Margins and the gutter follow KDP's rules for your page count." },
      { title: "Finishing touches", text: "Start chapters on a right-hand page, decorative chapter openings, running heads, a printed table of contents, bleed and a large-print edition are all switches on this tab." },
    ],
  },
  {
    id: "preview",
    title: "Preview on every device",
    summary: "Turn pages, zoom, and check phones, tablets and e-readers.",
    minutes: 2,
    where: "Write tab",
    steps: [
      { title: "Pick a device", text: "The menu above the preview lists the print page, iPhone, Android phones, iPad, Kindle Paperwhite, Oasis and Fire, Nook and Kobo." },
      { title: "Turn the pages", text: "Use Page and Chapter, your mouse wheel or the arrow keys. Zoom with + and −, or the expand button to fit." },
      { title: "Make room", text: "Drag the line between the editor and the preview to widen it." },
    ],
    tip: "The preview is quick but approximate. Build the print PDF on the Export tab for exact page breaks.",
  },
  {
    id: "cover",
    title: "Design your cover",
    summary: "A full wrap at the exact size, with AI art if you want it.",
    minutes: 5,
    where: "Cover tab",
    steps: [
      { title: "Choose the edition", text: "Ebook, Paperback and Hardcover each have their own cover. The print covers are sized from your trim, page count and paper, spine included." },
      { title: "Add art and lettering", text: "Upload your own art or make some with AI cover credits. Title, author and blurb are placed inside the safe areas, and the barcode box is kept clear." },
      { title: "Export", text: "Download the print-ready PDF and the KDP checks show anything that needs fixing first." },
    ],
  },
  {
    id: "export",
    title: "Export your files",
    summary: "Print PDFs, EPUB, Word and a backup.",
    minutes: 3,
    where: "Export tab",
    steps: [
      { title: "Print interior", text: "Build the paperback (and hardcover) interior PDF. The page count it reports is the one to give KDP for the cover." },
      { title: "Ebook", text: "Download the EPUB. It works on Kindle through KDP, Apple Books, Kobo, Barnes & Noble and Google Play." },
      { title: "Keep a backup", text: "The Backup file holds everything about the book in one file. Keep a copy somewhere safe." },
    ],
  },
  {
    id: "kdp",
    title: "Publish on Amazon KDP",
    summary: "From finished files to a live book, step by step.",
    minutes: 6,
    where: "Publish tab",
    steps: [
      { title: "Work through the checklist", text: "The Publish tab lists what KDP asks for: title, description, keywords, categories, files and cover. Each item turns green when it is ready." },
      { title: "Create the title on KDP", text: "In your KDP Bookshelf, create a Kindle eBook, Paperback or Hardcover. Copy your title, description and keywords from the Publish tab." },
      { title: "Upload the files", text: "Upload the EPUB for the ebook, or the interior PDF and cover PDF for print. Use the KDP previewer to check every page." },
      { title: "Go live", text: "Set the price and publish. Then, on the Publish tab, turn on \"On your website\" and add the store under \"Where to buy\" so readers can find it." },
    ],
  },
  {
    id: "website",
    title: "Set up your author website",
    summary: "Your books, samples and reader sign-ups at yourname.jollofpages.com.",
    minutes: 4,
    where: "Website page",
    steps: [
      { title: "Claim your address", text: "On the Website page, choose your yourname.jollofpages.com address and your colours." },
      { title: "Add your books", text: "Published books appear with their cover, a free sample from the chapters you marked as samples, and store links." },
      { title: "Grow your list", text: "Readers who sign up appear on the Readers page. They are yours; download them any time." },
    ],
  },
];

const KEY = "jp-learn-done";

export function loadDone(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function saveDone(done: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...done]));
  } catch {
    // no storage: progress lasts for this visit
  }
}
