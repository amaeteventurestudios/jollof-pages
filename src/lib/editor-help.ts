/** Copy for the help corner of the writing screen: release notes, keyboard shortcuts and the tour. */

export interface NewsItem {
  date: string;
  title: string;
  items: string[];
}

/** Newest first. The dot on "New" shows until the writer has seen the first entry. */
export const WHATS_NEW: NewsItem[] = [
  {
    date: "2026-10-29",
    title: "Style every block, and menus where you write",
    items: [
      "Change the colour, border, thickness, corners, font and size of any special block, and save the look as a preset to reuse.",
      "Six handwriting fonts for notes, letters and journal pages.",
      "Drag the six-dot handle to move a paragraph. Click it for drop caps, indents, letter spacing and more, each explained.",
      "Select words for a small toolbar with bold, italic, headings, links, comments and AI.",
      "Right-click anywhere in a chapter for cut, copy, formatting, notes, inserts and block tools. Shift + right-click still opens your browser's menu.",
      "What's new, keyboard shortcuts, a tour, help and bug reports now sit at the bottom of the tool rail.",
      "AI tools in the right-click menu for writing, fiction and teaching. Every suggestion shows what changed, and nothing goes in until you accept it.",
      "Insert blocks by what you want to do, with previews in your book's style. Type / on the page to insert by name or plain words.",
      "Star favourite blocks, see the ones you used last, and save any block to reuse in all your books.",
    ],
  },
  {
    date: "2026-10-28",
    title: "Book design",
    items: ["Interior themes, 61 special blocks, section backgrounds and print layout options.", "The studio runs as an app on phones and tablets."],
  },
  {
    date: "2026-10-27",
    title: "Help and video guides",
    items: ["A narrated video guide for every feature on the Learn page.", "Support tickets with screenshots, and an ideas board to vote on what comes next."],
  },
];

/** "Mod" is Cmd on a Mac and Ctrl elsewhere. */
export const SHORTCUTS: { group: string; keys: [string, string][] }[] = [
  {
    group: "Text",
    keys: [
      ["Mod+B", "Bold"],
      ["Mod+I", "Italic"],
      ["Mod+U", "Underline"],
      ["Mod+Shift+S", "Strikethrough"],
      ["Mod+Alt+2", "Heading"],
      ["Mod+Alt+3", "Subheading"],
      ["Mod+Alt+0", "Body text"],
    ],
  },
  {
    group: "Paragraphs",
    keys: [
      ["Mod+Shift+L", "Align left"],
      ["Mod+Shift+E", "Centre"],
      ["Mod+Shift+R", "Align right"],
      ["Mod+Shift+8", "Bulleted list"],
      ["Mod+Shift+7", "Numbered list"],
      ["Mod+Shift+B", "Block quote"],
    ],
  },
  {
    group: "Writing",
    keys: [
      ["Mod+Shift+N", "Add a footnote"],
      ["Mod+F", "Find and replace"],
      ["Mod+Z", "Undo"],
      ["Mod+Shift+Z", "Redo"],
      ["Mod+A", "Select all"],
      ["/", "Insert a block by name"],
      ["Mod+Enter", "Accept an AI suggestion"],
      ["Shift+Right-click", "Your browser's own menu (spelling)"],
    ],
  },
];

/** Each step points at an element marked data-tour="<target>". */
export const TOUR: { target: string; title: string; text: string }[] = [
  { target: "chapters", title: "Your chapters", text: "Every part of the book lives here. Click one to write in it, or add a new chapter, front matter or back matter." },
  { target: "insert", title: "Insert", text: "Add any of the 61 special blocks: callouts, exercises, letters, text messages, pictures and more." },
  { target: "manuscript", title: "The page", text: "Write here. Select words for a quick toolbar, right-click for more, and hover a paragraph for the six-dot handle to drag it or change its settings." },
  { target: "rail", title: "Writing tools", text: "Your AI assistant, find and replace, track changes and comments. Click one to open it beside the page." },
  { target: "preview", title: "Live preview", text: "See the printed page or the ebook as you type. Drag its edge to make it wider." },
  { target: "help", title: "Help is always here", text: "See what's new, look up shortcuts, retake this tour, or report a bug. A report goes straight to our support desk." },
];
