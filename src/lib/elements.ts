import type { Section } from "./types";
import { paragraphsToDoc, type DocNode } from "./doc/types";

export interface ElementKind {
  id: string;
  label: string;
  section: Section;
  /** shown as "Chapter 3" etc. in headings and the TOC */
  numbered: boolean;
  inToc: boolean;
  /** generated from book data at export time, so it has no editable text */
  smart?: boolean;
  /** heading is hidden in print (title page, copyright, dedication) */
  hideTitle?: boolean;
  /** pages that are not set like a chapter: a half title, a full-page picture, centred verse or ruled pages */
  layout?: "half_title" | "full_image" | "centered" | "lined";
  hint: string;
}

export const ELEMENT_KINDS: ElementKind[] = [
  { id: "title_page", label: "Title page", section: "front", numbered: false, inToc: false, smart: true, hideTitle: true, hint: "Built from the book's title, subtitle, author and imprint." },
  { id: "half_title", label: "Half title", section: "front", numbered: false, inToc: false, hideTitle: true, layout: "half_title", hint: "Just the book's title, on the page before the title page." },
  { id: "frontispiece", label: "Frontispiece", section: "front", numbered: false, inToc: false, hideTitle: true, layout: "full_image", hint: "A full-page picture facing the title page." },
  { id: "copyright", label: "Copyright", section: "front", numbered: false, inToc: false, hideTitle: true, hint: "Rights notice, ISBNs and edition. Prefilled from your book details." },
  { id: "dedication", label: "Dedication", section: "front", numbered: false, inToc: false, hideTitle: true, hint: "A short line, set centered on its own page." },
  { id: "epigraph", label: "Epigraph", section: "front", numbered: false, inToc: false, hideTitle: true, hint: "An opening quotation." },
  { id: "praise", label: "Praise for the book", section: "front", numbered: false, inToc: false, hint: "Quotes from early readers and reviewers." },
  { id: "also_by_front", label: "Also by (front)", section: "front", numbered: false, inToc: false, smart: true, hint: "The author's other books, listed before the story starts." },
  { id: "contents", label: "Table of contents", section: "front", numbered: false, inToc: false, smart: true, hint: "Generated from your chapters at export." },
  { id: "illustrations", label: "List of illustrations", section: "front", numbered: false, inToc: true, hint: "Figures and plates, with captions." },
  { id: "tables_list", label: "List of tables", section: "front", numbered: false, inToc: true, hint: "Every table in the book." },
  { id: "abbreviations", label: "Abbreviations", section: "front", numbered: false, inToc: true, hint: "Short forms used in the text." },
  { id: "content_note", label: "Content note", section: "front", numbered: false, inToc: false, hint: "A gentle warning about difficult themes." },
  { id: "cast", label: "Cast of characters", section: "front", numbered: false, inToc: true, hint: "Who is who, for big casts." },
  { id: "map", label: "Map", section: "front", numbered: false, inToc: true, layout: "full_image", hint: "A full-page map of the book's world." },
  { id: "family_tree", label: "Family tree", section: "front", numbered: false, inToc: true, hint: "Families and houses at a glance." },
  { id: "pronunciation", label: "Pronunciation guide", section: "front", numbered: false, inToc: true, hint: "How to say names and words from the book." },
  { id: "timeline_front", label: "Chronology", section: "front", numbered: false, inToc: true, hint: "Key dates before the story begins." },
  { id: "translator_note", label: "Translator's note", section: "front", numbered: false, inToc: true, hint: "A word from the translator." },
  { id: "author_note", label: "Author's note", section: "front", numbered: false, inToc: true, hint: "A short word from the author before the book begins." },
  { id: "about_book", label: "About this book", section: "front", numbered: false, inToc: true, hint: "What the book covers and who it is for." },
  { id: "how_to_use", label: "How to use this book", section: "front", numbered: false, inToc: true, hint: "How to read, work through or dip into the book." },
  { id: "foreword", label: "Foreword", section: "front", numbered: false, inToc: true, hint: "Written by someone other than the author." },
  { id: "preface", label: "Preface", section: "front", numbered: false, inToc: true, hint: "How and why you wrote this book." },
  { id: "introduction", label: "Introduction", section: "front", numbered: false, inToc: true, hint: "Sets up the argument of the book." },
  { id: "summary", label: "Summary", section: "front", numbered: false, inToc: true, hint: "The whole book in a page." },
  { id: "prologue", label: "Prologue", section: "body", numbered: false, inToc: true, hint: "A scene before the story proper." },
  { id: "part", label: "Part", section: "body", numbered: false, inToc: true, hint: "A divider page that groups the chapters after it." },
  { id: "chapter", label: "Chapter", section: "body", numbered: true, inToc: true, hint: "The main text." },
  { id: "unnumbered", label: "Unnumbered chapter", section: "body", numbered: false, inToc: true, hint: "A chapter without a number." },
  { id: "interlude", label: "Interlude", section: "body", numbered: false, inToc: true, hint: "A pause between parts or chapters." },
  { id: "lesson", label: "Lesson", section: "body", numbered: false, inToc: true, hint: "One lesson in a course or workbook." },
  { id: "module", label: "Module", section: "body", numbered: false, inToc: true, hint: "A group of lessons." },
  { id: "case_study", label: "Case study", section: "body", numbered: false, inToc: true, hint: "A real example worked through in detail." },
  { id: "exercises", label: "Exercises", section: "body", numbered: false, inToc: true, hint: "Practice questions and activities." },
  { id: "workbook", label: "Workbook pages", section: "body", numbered: false, inToc: true, layout: "lined", hint: "Prompts with space to write." },
  { id: "recipe", label: "Recipe", section: "body", numbered: false, inToc: true, hint: "Ingredients, method and notes." },
  { id: "poem", label: "Poem", section: "body", numbered: false, inToc: true, layout: "centered", hint: "One poem on its own page." },
  { id: "short_story", label: "Short story", section: "body", numbered: false, inToc: true, hint: "A story in a collection." },
  { id: "essay", label: "Essay", section: "body", numbered: false, inToc: true, hint: "An essay in a collection." },
  { id: "letter", label: "Letter", section: "body", numbered: false, inToc: true, hint: "A letter, set as a letter." },
  { id: "journal_entry", label: "Journal entry", section: "body", numbered: false, inToc: true, hint: "A dated diary or journal entry." },
  { id: "interview", label: "Interview", section: "body", numbered: false, inToc: true, hint: "Questions and answers." },
  { id: "devotional", label: "Devotional day", section: "body", numbered: false, inToc: true, hint: "A reading, a reflection and a prayer for one day." },
  { id: "scene", label: "Scene", section: "body", numbered: false, inToc: true, hint: "A scene in a play or screenplay." },
  { id: "act", label: "Act", section: "body", numbered: false, inToc: true, hint: "A divider page for one act of a play." },
  { id: "photo_essay", label: "Photo essay", section: "body", numbered: false, inToc: true, hint: "Pictures with short captions." },
  { id: "full_page_image", label: "Full-page image", section: "body", numbered: false, inToc: false, layout: "full_image", hint: "One picture filling the whole page." },
  { id: "bonus_chapter", label: "Bonus chapter", section: "body", numbered: false, inToc: true, hint: "An extra chapter for readers." },
  { id: "epilogue", label: "Epilogue", section: "body", numbered: false, inToc: true, hint: "What happened after." },
  { id: "extended_epilogue", label: "Extended epilogue", section: "body", numbered: false, inToc: true, hint: "A longer look into the future." },
  { id: "conclusion", label: "Conclusion", section: "back", numbered: false, inToc: true, hint: "Brings the argument home." },
  { id: "afterword", label: "Afterword", section: "back", numbered: false, inToc: true, hint: "Reflections after the main text." },
  { id: "key_takeaways", label: "Key takeaways", section: "back", numbered: false, inToc: true, hint: "The main points, in a list." },
  { id: "next_steps", label: "Next steps", section: "back", numbered: false, inToc: true, hint: "What the reader should do now." },
  { id: "discussion", label: "Discussion questions", section: "back", numbered: false, inToc: true, hint: "Questions for book clubs and classes." },
  { id: "reading_guide", label: "Reading group guide", section: "back", numbered: false, inToc: true, hint: "A guide for book clubs." },
  { id: "author_qa", label: "A conversation with the author", section: "back", numbered: false, inToc: true, hint: "The author answers readers' questions." },
  { id: "historical_note", label: "Historical note", section: "back", numbered: false, inToc: true, hint: "What is true and what is invented." },
  { id: "sources_note", label: "A note on sources", section: "back", numbered: false, inToc: true, hint: "Where the material came from." },
  { id: "acknowledgments", label: "Acknowledgments", section: "back", numbered: false, inToc: true, hint: "Thank the people who helped." },
  { id: "appendix", label: "Appendix", section: "back", numbered: false, inToc: true, hint: "Extra material that supports the book." },
  { id: "answer_key", label: "Answer key", section: "back", numbered: false, inToc: true, hint: "Answers to the exercises." },
  { id: "templates", label: "Templates and worksheets", section: "back", numbered: false, inToc: true, hint: "Forms and worksheets readers can copy." },
  { id: "resources", label: "Resources", section: "back", numbered: false, inToc: true, hint: "Further reading, tools and links." },
  { id: "further_reading", label: "Further reading", section: "back", numbered: false, inToc: true, hint: "Books and articles to read next." },
  { id: "references", label: "References", section: "back", numbered: false, inToc: true, hint: "Works cited in academic style." },
  { id: "notes", label: "Notes", section: "back", numbered: false, inToc: true, hint: "Endnotes and sources." },
  { id: "bibliography", label: "Bibliography", section: "back", numbered: false, inToc: true, hint: "Works cited." },
  { id: "glossary", label: "Glossary", section: "back", numbered: false, inToc: true, hint: "Terms and definitions." },
  { id: "index", label: "Index", section: "back", numbered: false, inToc: true, hint: "Subjects and names with page numbers." },
  { id: "recipe_index", label: "Recipe index", section: "back", numbered: false, inToc: true, hint: "Every recipe, by name." },
  { id: "timeline", label: "Timeline", section: "back", numbered: false, inToc: true, hint: "Key dates in order." },
  { id: "notes_pages", label: "Notes pages", section: "back", numbered: false, inToc: true, layout: "lined", hint: "Blank lined pages for the reader's notes." },
  { id: "permissions", label: "Permissions and credits", section: "back", numbered: false, inToc: true, hint: "Credits for quotes, pictures and songs." },
  { id: "contributors", label: "Contributors", section: "back", numbered: false, inToc: true, hint: "Everyone who wrote for an anthology." },
  { id: "about_author", label: "About the author", section: "back", numbered: false, inToc: true, hint: "Prefilled from the author profile." },
  { id: "about_illustrator", label: "About the illustrator", section: "back", numbered: false, inToc: true, hint: "A short biography of the illustrator." },
  { id: "about_translator", label: "About the translator", section: "back", numbered: false, inToc: true, hint: "A short biography of the translator." },
  { id: "about_publisher", label: "About the publisher", section: "back", numbered: false, inToc: true, hint: "Your imprint, in a paragraph." },
  { id: "also_by", label: "Also by", section: "back", numbered: false, inToc: true, smart: true, hint: "Lists the author's other published books." },
  { id: "sneak_peek", label: "Sneak peek", section: "back", numbered: false, inToc: true, hint: "The opening of the next book." },
  { id: "bonus_scene", label: "Bonus scene", section: "back", numbered: false, inToc: true, hint: "An extra scene for fans." },
  { id: "dear_reader", label: "A letter to the reader", section: "back", numbered: false, inToc: true, hint: "A personal thank-you from the author." },
  { id: "newsletter", label: "Join the newsletter", section: "back", numbered: false, inToc: true, hint: "Invite readers to your mailing list." },
  { id: "review_request", label: "Review request", section: "back", numbered: false, inToc: false, hint: "Ask readers to leave a review." },
  { id: "coming_soon", label: "Coming soon", section: "back", numbered: false, inToc: true, hint: "Announce the next book." },
  { id: "colophon", label: "Colophon", section: "back", numbered: false, inToc: false, hint: "How the book was made: typefaces, paper, printing." },
];

export function elementKind(id: string): ElementKind {
  return ELEMENT_KINDS.find((k) => k.id === id) ?? ELEMENT_KINDS.find((k) => k.id === "chapter")!;
}

export const SECTION_LABELS: Record<Section, string> = {
  front: "Front matter",
  body: "Body",
  back: "Back matter",
};

export interface TemplateContext {
  title: string;
  author: string;
  year: number;
  imprint: string;
  isbnEbook?: string;
  isbnPaperback?: string;
  isbnHardcover?: string;
  authorBio?: string;
}

export function defaultContent(kind: string, ctx: TemplateContext): DocNode {
  switch (kind) {
    case "copyright":
      return paragraphsToDoc(
        [
          `Copyright © ${ctx.year} ${ctx.author}`,
          "All rights reserved. No part of this book may be reproduced in any form or by any electronic or mechanical means, including information storage and retrieval systems, without written permission from the author, except for the use of brief quotations in a book review.",
          ctx.isbnPaperback ? `ISBN ${ctx.isbnPaperback} (paperback)` : "",
          ctx.isbnHardcover ? `ISBN ${ctx.isbnHardcover} (hardcover)` : "",
          ctx.isbnEbook ? `ISBN ${ctx.isbnEbook} (ebook)` : "",
          `Published by ${ctx.imprint}`,
          "First edition",
        ]
          .filter(Boolean)
          .join("\n\n"),
      );
    case "about_author":
      return paragraphsToDoc(ctx.authorBio || `${ctx.author} writes about …`);
    case "review_request":
      return paragraphsToDoc(
        `Thank you for reading ${ctx.title}.\n\nIf this book helped you, please consider leaving a short review where you bought it. Reviews help other readers find the book and mean a great deal to independent authors.`,
      );
    default:
      return { type: "doc", content: [{ type: "paragraph" }] };
  }
}

/** Elements a new non-fiction book starts with. */
export const STARTER_ELEMENTS: { kind: string; title: string }[] = [
  { kind: "title_page", title: "Title page" },
  { kind: "copyright", title: "Copyright" },
  { kind: "dedication", title: "Dedication" },
  { kind: "contents", title: "Contents" },
  { kind: "introduction", title: "Introduction" },
  { kind: "chapter", title: "Chapter one" },
  { kind: "acknowledgments", title: "Acknowledgments" },
  { kind: "about_author", title: "About the author" },
];
