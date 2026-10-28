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
  hint: string;
}

export const ELEMENT_KINDS: ElementKind[] = [
  { id: "title_page", label: "Title page", section: "front", numbered: false, inToc: false, smart: true, hideTitle: true, hint: "Built from the book's title, subtitle, author and imprint." },
  { id: "copyright", label: "Copyright", section: "front", numbered: false, inToc: false, hideTitle: true, hint: "Rights notice, ISBNs and edition. Prefilled from your book details." },
  { id: "dedication", label: "Dedication", section: "front", numbered: false, inToc: false, hideTitle: true, hint: "A short line, set centered on its own page." },
  { id: "epigraph", label: "Epigraph", section: "front", numbered: false, inToc: false, hideTitle: true, hint: "An opening quotation." },
  { id: "contents", label: "Table of contents", section: "front", numbered: false, inToc: false, smart: true, hint: "Generated from your chapters at export." },
  { id: "foreword", label: "Foreword", section: "front", numbered: false, inToc: true, hint: "Written by someone other than the author." },
  { id: "preface", label: "Preface", section: "front", numbered: false, inToc: true, hint: "How and why you wrote this book." },
  { id: "introduction", label: "Introduction", section: "front", numbered: false, inToc: true, hint: "Sets up the argument of the book." },
  { id: "part", label: "Part", section: "body", numbered: false, inToc: true, hint: "A divider page that groups the chapters after it." },
  { id: "chapter", label: "Chapter", section: "body", numbered: true, inToc: true, hint: "The main text." },
  { id: "conclusion", label: "Conclusion", section: "back", numbered: false, inToc: true, hint: "Brings the argument home." },
  { id: "afterword", label: "Afterword", section: "back", numbered: false, inToc: true, hint: "Reflections after the main text." },
  { id: "acknowledgments", label: "Acknowledgments", section: "back", numbered: false, inToc: true, hint: "Thank the people who helped." },
  { id: "resources", label: "Resources", section: "back", numbered: false, inToc: true, hint: "Further reading, tools and links." },
  { id: "notes", label: "Notes", section: "back", numbered: false, inToc: true, hint: "Endnotes and sources." },
  { id: "bibliography", label: "Bibliography", section: "back", numbered: false, inToc: true, hint: "Works cited." },
  { id: "glossary", label: "Glossary", section: "back", numbered: false, inToc: true, hint: "Terms and definitions." },
  { id: "about_author", label: "About the author", section: "back", numbered: false, inToc: true, hint: "Prefilled from the author profile." },
  { id: "also_by", label: "Also by", section: "back", numbered: false, inToc: true, smart: true, hint: "Lists the author's other published books." },
  { id: "review_request", label: "Review request", section: "back", numbered: false, inToc: false, hint: "Ask readers to leave a review." },
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
