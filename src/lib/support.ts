/** Help requests, shared by the studio and the API. */

export const SUPPORT_TOPICS = [
  { id: "question", label: "A question about the studio" },
  { id: "publishing", label: "Publishing on Amazon KDP or elsewhere" },
  { id: "formatting", label: "Formatting, print PDF or ebook files" },
  { id: "covers", label: "Covers and AI cover art" },
  { id: "website", label: "My author website or domain" },
  { id: "billing", label: "Payments, credits or my plan" },
  { id: "bug", label: "Something is broken" },
  { id: "idea", label: "An idea or feature request" },
] as const;

export type SupportTopic = (typeof SUPPORT_TOPICS)[number]["id"];

export interface SupportReply {
  from: "writer" | "support";
  text: string;
  at: string;
  /** screenshots sent with this reply: names in the ticket's attachments */
  files?: string[];
}

export interface SupportRequest {
  id: string;
  owner: string;
  email: string;
  topic: SupportTopic;
  subject: string;
  message: string;
  status: "open" | "answered" | "closed";
  replies: SupportReply[] | null;
  page: string;
  /** the ticket number people quote, from 1001 */
  number: number;
  /** every file on the ticket; the first message's are those no reply lists */
  attachments: string[];
  created: string;
  updated: string;
}

export function topicLabel(id: string): string {
  return SUPPORT_TOPICS.find((t) => t.id === id)?.label ?? "Other";
}

/** "#1042", or nothing for a ticket from before numbering. */
export function ticketNo(r: Pick<SupportRequest, "number">): string {
  return r.number ? `#${r.number}` : "";
}

export const TICKET_FILES = { max: 5, maxBytes: 10 * 1024 * 1024, accept: "image/png,image/jpeg,image/webp,image/gif,application/pdf" };

/** Feature requests: what writers ask for, and where each stands. */
export const IDEA_STATUSES = [
  { id: "new", label: "Under review" },
  { id: "planned", label: "Planned" },
  { id: "in_progress", label: "In progress" },
  { id: "shipped", label: "Shipped" },
  { id: "declined", label: "Not planned" },
] as const;

export type IdeaStatus = (typeof IDEA_STATUSES)[number]["id"];

/** One idea as a writer sees it: never who voted, only how many and whether they did. */
export interface Idea {
  id: string;
  title: string;
  details: string;
  status: IdeaStatus;
  votes: number;
  voted: boolean;
  mine: boolean;
  response: string;
  created: string;
}
