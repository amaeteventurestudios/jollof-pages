/** Answers for the Help page. Plain text; blank-line paragraphs. Kept here so search can index them. */

export interface Faq {
  q: string;
  a: string;
}

export interface FaqGroup {
  id: string;
  title: string;
  items: Faq[];
}

export const FAQ: FaqGroup[] = [
  {
    id: "writing",
    title: "Writing",
    items: [
      {
        q: "Does the studio save my work?",
        a: 'Yes. Every chapter saves itself a moment after you stop typing, and again when you switch chapters. The book header shows "All changes saved" once it is done. If you close the tab with a change still waiting, your browser asks you first.',
      },
      {
        q: "How do I add a chapter, a foreword or an acknowledgments page?",
        a: 'Use the big "Add new chapter" button at the bottom of the chapter list. For anything else, like a foreword, epigraph, glossary or About the author, use the + next to Front matter, Body or Back matter. Drag the handle on the left of any row to reorder.',
      },
      {
        q: "Can I import a manuscript I already wrote?",
        a: 'Yes. On the Books page, choose "Import Word or Markdown" and pick your file. Headings become chapters, and bold, italic, footnotes and images come across.',
      },
      {
        q: "How do I find and replace a word in the whole book?",
        a: 'Open the search icon on the tool rail to the right of the editor (or press Ctrl+F, Cmd+F on a Mac). Choose "Whole book" to see every match in every chapter, then replace them one chapter at a time or all at once. "Match case" and "Whole word" narrow the search.',
      },
      {
        q: "What are smart quotes and why do they matter?",
        a: "Printed books use curly quotes (“ ” ‘ ’) rather than the straight ones a keyboard types. Text pasted from other apps often mixes the two. The quote icon on the tool rail lists every chapter with straight quotes and fixes them in one click. You can undo the change in the current chapter.",
      },
      {
        q: "Can I change how the editor looks without changing the book?",
        a: "Yes. The Aa icon on the tool rail sets the font, size, line spacing, indented or spaced paragraphs and justification of the writing area only. Your printed book and ebook keep the theme chosen on the Format tab.",
      },
    ],
  },
  {
    id: "assistant",
    title: "Writing assistant",
    items: [
      {
        q: "How do I turn on the writing assistant?",
        a: "In the Write tab, click the sparkle button at the top of the tool rail on the right. Choose Claude, ChatGPT or OpenRouter, then paste an API key from that company. The panel shows the exact page to get one. Your key is stored encrypted and never shown again.",
      },
      {
        q: "Who pays for the assistant?",
        a: "You do, directly, through your own API key. Claude is billed by Anthropic, ChatGPT by OpenAI and OpenRouter by OpenRouter. Jollof Pages adds nothing on top. A typical request costs a cent or two.",
      },
      {
        q: "What does the assistant see?",
        a: "The book's title and list of sections, the chapter you have open, any words you select, and your recent conversation about this book. It does not see your other books unless you mention them.",
      },
      {
        q: "What does it remember, and can I delete it?",
        a: "With \"Remember between sessions\" on, it keeps short facts it learns, such as character names, settings and your style preferences, so you don't have to repeat them. Click the brain button in the assistant panel to see every fact and delete any of them, or all of them. Turn memory off in the assistant's settings.",
      },
      {
        q: "How do I put its writing into my chapter?",
        a: "Under each reply, Insert adds it after the paragraph your cursor is in. If you selected words first, Replace selection swaps them for the reply. Ctrl+Z undoes either one.",
      },
    ],
  },
  {
    id: "formatting",
    title: "Formatting and preview",
    items: [
      {
        q: "How do I see what my book will look like?",
        a: "The preview beside the editor shows the current chapter as a printed page or on a phone, tablet or e-reader. Turn pages with the Page buttons, the arrow keys or your mouse wheel, jump chapters with the Chapter buttons, and zoom with + and −. Drag the edge of the preview to make it wider.",
      },
      {
        q: "Can I hide a chapter's title, page number or running head?",
        a: "Yes. Open Chapter settings (the sliders icon next to the chapter title). You can hide the heading, the page numbers or the running head, use a smaller title, add a chapter image, or set the title in white over the image.",
      },
      {
        q: "Why does the preview's page count differ from the PDF?",
        a: "The preview is a fast approximation in your browser. The print PDF is typeset properly, with hyphenation, widow control and the exact KDP gutter, so it is the one to trust for page breaks and page count.",
      },
      {
        q: "Which trim sizes are supported?",
        a: 'All the common KDP paperback sizes, including 5" x 8", 5.5" x 8.5", 6" x 9" and 8.5" x 11". Hardcovers come in KDP\'s five case laminate sizes. Margins and the gutter are set from KDP\'s rules for your page count.',
      },
    ],
  },
  {
    id: "publishing",
    title: "Exporting and publishing",
    items: [
      {
        q: "What files do I upload to Amazon KDP?",
        a: "For an ebook, the EPUB from the Export tab. For a paperback, the paperback interior PDF and the full cover PDF from the Cover tab. For a hardcover, the hardcover interior PDF and the hardcover wrap. The Publish tab has a checklist that walks through each one.",
      },
      {
        q: "Can I publish somewhere other than Amazon?",
        a: "Yes. The EPUB works on Apple Books, Kobo, Barnes & Noble and Google Play, and the print PDFs suit IngramSpark and most printers. You can also sell ebooks directly on your author website.",
      },
      {
        q: "Do I need my own ISBN?",
        a: "Not for KDP, which gives you a free one. You need your own ISBN to publish the same print edition elsewhere under your imprint. Each edition (ebook, paperback, hardcover) gets its own number, entered on the Book details tab.",
      },
    ],
  },
  {
    id: "covers",
    title: "Covers",
    items: [
      {
        q: "How does the cover designer work?",
        a: "The Cover tab lays out the front, spine and back at the exact size for your trim, page count and paper. Add your art, title and blurb; the safe areas and barcode box are shown so nothing gets cut off.",
      },
      {
        q: "How do AI cover credits work?",
        a: "$10 buys 100 credits. A draft image costs 2 credits and a print-ready 4K image 4 credits, so $10 makes about 50 drafts or 25 print-ready covers. Credits never expire and are only spent when an image is made.",
      },
    ],
  },
  {
    id: "website",
    title: "Your website and readers",
    items: [
      {
        q: "Where is my author website?",
        a: "Every studio comes with a website at yourname.jollofpages.com. It lists your books, gives each one a page with a free sample and buy links, and has a sign-up form for your reader list. Set it up on the Website page.",
      },
      {
        q: "Can I use my own domain?",
        a: "Yes, with Author Site Pro. Connect a domain you own, like yourname.com, from the Website page; the address checks and the security certificate are handled for you.",
      },
      {
        q: "Who are my readers?",
        a: "The Readers page lists everyone who joined your list from your website. They belong to you; you can export them at any time.",
      },
    ],
  },
  {
    id: "account",
    title: "Account and billing",
    items: [
      {
        q: "Is there a subscription?",
        a: "No. The studio is one payment of $119 with every future update included. AI cover credits are optional and pay as you go. Author Site Pro is the only monthly plan, and you only need it for your own domain and the Pro website features.",
      },
      {
        q: "Can I install the studio like an app?",
        a: 'Yes. Use the Install button in the studio header, or your browser\'s "Install" or "Add to Home Screen" option, to open the studio in its own window.',
      },
      {
        q: "How do I get help with something not listed here?",
        a: 'Send a message with the form on this page. We answer within one working day, usually sooner, and every reply also appears under "Your messages" below the form.',
      },
    ],
  },
];

/** Lowercased haystack for search. */
export function faqMatches(f: Faq, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = `${f.q} ${f.a}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}
