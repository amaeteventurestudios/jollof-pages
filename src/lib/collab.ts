/** Collaboration roles and the names live documents go by, shared by the studio and the collab server. */

export type CollabRole = "owner" | "cowriter" | "editor" | "commenter";

export const ROLE_INFO: Record<Exclude<CollabRole, "owner">, { label: string; tab: string; text: string }> = {
  cowriter: { label: "Co-writer", tab: "Co-write", text: "Writes and edits alongside you, live. You see each other's cursors." },
  editor: { label: "Editor", tab: "Track changes", text: "Edits arrive as tracked changes. You accept or reject each one." },
  commenter: { label: "Commenter", tab: "Comments", text: "Reads the book and leaves comments. Cannot change the text." },
};

export interface RoleHolder {
  owner: string;
  cowriters?: string[];
  editors?: string[];
  commenters?: string[];
}

export function roleOf(book: RoleHolder, userId: string | undefined | null): CollabRole | null {
  if (!userId) return null;
  if (book.owner === userId) return "owner";
  if (book.cowriters?.includes(userId)) return "cowriter";
  if (book.editors?.includes(userId)) return "editor";
  if (book.commenters?.includes(userId)) return "commenter";
  return null;
}

/** Shared with anyone at all: such books are edited through the collab server. */
export function isShared(book: RoleHolder): boolean {
  return !!(book.cowriters?.length || book.editors?.length || book.commenters?.length);
}

/** "chapter:<id>:<generation>". A new generation starts when the chapter was changed outside live editing. */
export function docName(chapterId: string, gen: string): string {
  return `chapter:${chapterId}:${gen}`;
}

export function parseDocName(name: string): { chapterId: string; gen: string } | null {
  const m = /^chapter:([a-z0-9]{15}):([a-z0-9]{1,40})$/.exec(name);
  return m ? { chapterId: m[1], gen: m[2] } : null;
}

/** Stable hash input: the same content always serializes the same way, whatever its key order. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as Record<string, unknown>)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}
