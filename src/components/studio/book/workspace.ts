import type { Dispatch, SetStateAction } from "react";
import type { Book, Chapter } from "@/lib/types";
import type { CollabRole } from "@/lib/collab";

/** Shared state of the book workspace, passed to every tab. */
export interface Workspace {
  book: Book;
  chapters: Chapter[];
  setChapters: Dispatch<SetStateAction<Chapter[]>>;
  setBook: Dispatch<SetStateAction<Book | null>>;
  saveBook: (patch: Partial<Book>) => Promise<Book>;
  /** wraps a save so the header shows "Saving…" */
  track: <T>(p: Promise<T>) => Promise<T>;
  /** the signed-in person's part in this book */
  role: CollabRole;
  /** shared with anyone: chapters are edited live through the collab server */
  live: boolean;
}
