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
  created: string;
  updated: string;
}

export function topicLabel(id: string): string {
  return SUPPORT_TOPICS.find((t) => t.id === id)?.label ?? "Other";
}
