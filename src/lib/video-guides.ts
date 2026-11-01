/**
 * Short video guides, one per studio feature. The videos are recorded from the real studio by
 * scripts/video-guides (npm run videos), which also writes their lengths to video-guides.json.
 */
import lengths from "./video-guides.json";

export interface VideoGuide {
  id: string;
  title: string;
  summary: string;
  group: VideoGroup;
  /** the Learn page guide this video belongs to, if any */
  tutorial?: string;
}

export const VIDEO_GROUPS = ["Getting started", "Writing", "Working together", "Covers and images", "Formatting and export", "Publishing and selling", "Website and readers"] as const;
export type VideoGroup = (typeof VIDEO_GROUPS)[number];

export const VIDEO_GUIDES: VideoGuide[] = [
  { id: "tour", title: "A quick tour of the studio", summary: "Where everything lives, dark mode and your account menu.", group: "Getting started" },
  { id: "new-book", title: "Start a new book", summary: "Create a book with a title, pen name and the usual front pages.", group: "Getting started", tutorial: "first-book" },
  { id: "import", title: "Import a manuscript", summary: "Bring in a Word or Markdown file; each heading becomes a chapter.", group: "Getting started", tutorial: "first-book" },
  { id: "isbn", title: "Add a book you already published", summary: "List an existing book on your site from its ISBN.", group: "Getting started", tutorial: "first-book" },
  { id: "pen-names", title: "Pen names", summary: "Add the names you publish under, with a bio and photo.", group: "Getting started" },
  { id: "box-set", title: "Make a box set", summary: "Bundle several books into one omnibus edition.", group: "Getting started" },

  { id: "chapters", title: "Add and reorder chapters", summary: "Chapters, parts, front and back matter, drag to reorder.", group: "Writing", tutorial: "write" },
  { id: "toolbar", title: "Style your text", summary: "Headings, quotes, callouts, scene breaks, lists and footnotes.", group: "Writing", tutorial: "write" },
  { id: "chapter-settings", title: "Chapter status and settings", summary: "Subtitles, Draft to Final, and per-chapter options.", group: "Writing", tutorial: "chapter-settings" },
  { id: "editor-settings", title: "Make the editor comfortable", summary: "Font, size, line height and a distraction-free view.", group: "Writing", tutorial: "write" },
  { id: "find-replace", title: "Find and replace", summary: "Search one chapter or the whole book and fix every match.", group: "Writing", tutorial: "tools" },
  { id: "smart-quotes", title: "Fix quotes and dashes", summary: "Turn straight quotes into curly ones across the book.", group: "Writing", tutorial: "tools" },
  { id: "sprint", title: "Writing sprints", summary: "Time a focused burst of writing and see your words.", group: "Writing" },
  { id: "goals", title: "Set a word goal", summary: "A target and a deadline, with the daily words to hit it.", group: "Writing", tutorial: "first-book" },
  { id: "progress", title: "Track your progress", summary: "Your writing streak, daily words and every book's progress.", group: "Writing" },
  { id: "assistant", title: "The writing assistant", summary: "Pick Claude, ChatGPT or OpenRouter and ask about your book.", group: "Writing" },
  { id: "preview", title: "Preview on every device", summary: "See each chapter as a paperback, Kindle, phone or tablet page.", group: "Writing", tutorial: "preview" },
  { id: "full-preview", title: "Full book preview", summary: "Turn the pages of the whole book before you export.", group: "Writing", tutorial: "preview" },

  { id: "invite", title: "Invite someone to your book", summary: "Add a co-writer, an editor or a reader who comments.", group: "Working together" },
  { id: "track-changes", title: "Track changes", summary: "Review an editor's changes and accept or reject each one.", group: "Working together" },
  { id: "comments", title: "Comments", summary: "Leave notes on any passage and reply to them.", group: "Working together" },

  { id: "cover-designer", title: "Design a cover", summary: "Pick a layout, colours and type for your ebook cover.", group: "Covers and images", tutorial: "cover" },
  { id: "cover-kit", title: "Use your own cover art", summary: "Exact KDP sizes, a wrap template and a print check.", group: "Covers and images", tutorial: "cover" },
  { id: "ai-cover", title: "Make cover art with AI", summary: "Describe a picture, choose a style and make drafts.", group: "Covers and images", tutorial: "cover" },
  { id: "chapter-images", title: "Images in chapters", summary: "Add a picture to a chapter, with a caption.", group: "Covers and images", tutorial: "chapter-settings" },
  { id: "images", title: "My images", summary: "One library for every picture across your books.", group: "Covers and images" },

  { id: "details", title: "Book details", summary: "Title, description, keywords and categories for the stores.", group: "Formatting and export", tutorial: "kdp" },
  { id: "format", title: "Format your interior", summary: "Choose a theme, trim size, paper and type.", group: "Formatting and export", tutorial: "format" },
  { id: "hardcover", title: "Add a hardcover edition", summary: "KDP case laminate sizes and a hardcover PDF.", group: "Formatting and export", tutorial: "format" },
  { id: "export", title: "Export your files", summary: "Print PDF, EPUB, Word and a full backup.", group: "Formatting and export", tutorial: "export" },

  { id: "kdp", title: "Publish on Amazon KDP", summary: "The checklist that walks you through KDP's forms.", group: "Publishing and selling", tutorial: "kdp" },
  { id: "book-page", title: "Your book's page", summary: "A free sample, store links, praise and reviews.", group: "Publishing and selling", tutorial: "website" },

  { id: "website", title: "Set up your author website", summary: "Your address, about page, contact links and design.", group: "Website and readers", tutorial: "website" },
  { id: "readers", title: "Readers and newsletters", summary: "Your reader list and the newsletters you send it.", group: "Website and readers" },
  { id: "own-email", title: "Send newsletters from your own free account", summary: "Sign up for Resend, make a key, paste it here and add your DNS records.", group: "Website and readers" },
  { id: "analytics", title: "Analytics", summary: "Visitors, popular pages, store clicks and sign-ups.", group: "Website and readers" },
  { id: "help", title: "Get help", summary: "Search common questions or open a ticket.", group: "Website and readers" },
];

/** Seconds per video, written by the recorder. */
export const VIDEO_LENGTHS: Record<string, number> = lengths;

export const videoSrc = (id: string) => `/learn/videos/${id}.mp4`;
export const videoPoster = (id: string) => `/learn/videos/${id}.jpg`;
export const videoCaptions = (id: string) => `/learn/videos/${id}.vtt`;
