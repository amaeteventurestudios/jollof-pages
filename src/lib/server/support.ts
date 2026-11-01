import "server-only";
import { roleOf } from "./admin";
import { letterHtml, letterText, mailConfigured, sendMail } from "./mail";
import { TICKET_FILES, ticketNo, topicLabel, type SupportRequest } from "../support";

/**
 * Who answers help requests: the addresses in SUPPORT_EMAILS (comma separated), or OWNER_EMAIL.
 * They see every request in the studio's support inbox and get each new one by email.
 */
export function supportTeam(): string[] {
  return (process.env.SUPPORT_EMAILS || process.env.OWNER_EMAIL || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** The support team: SUPPORT_EMAILS, plus anyone on the admin Team as owner, admin or support. */
export async function isSupport(email: string): Promise<boolean> {
  if (supportTeam().includes(email.toLowerCase())) return true;
  const role = await roleOf(email);
  return role === "owner" || role === "admin" || role === "support";
}

/** The public address for support, used as the reply-to on every support email. */
export const SUPPORT_ADDRESS = process.env.SUPPORT_ADDRESS || "support@jollofpages.com";

/**
 * A ticket's fields and screenshots, from JSON or a multipart form ("files" may repeat).
 * Screenshots are checked here so a bad file is a plain sentence, not a database error.
 */
export async function readTicketBody(req: Request): Promise<{ fields: Record<string, string>; files: File[] } | { error: string }> {
  if (!(req.headers.get("content-type") || "").includes("multipart/form-data")) {
    const j = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return { fields: Object.fromEntries(Object.entries(j).map(([k, v]) => [k, typeof v === "string" ? v : ""])), files: [] };
  }
  const form = await req.formData().catch(() => null);
  if (!form) return { error: "Could not read the message." };
  const fields: Record<string, string> = {};
  const files: File[] = [];
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") fields[k] = v;
    else if (k === "files" && v.size) files.push(v);
  }
  if (files.length > TICKET_FILES.max) return { error: `Attach up to ${TICKET_FILES.max} files at a time.` };
  const allowed = TICKET_FILES.accept.split(",");
  for (const f of files) {
    if (!allowed.includes(f.type)) return { error: `${f.name} is not a picture or PDF.` };
    if (f.size > TICKET_FILES.maxBytes) return { error: `${f.name} is larger than 10 MB.` };
  }
  return { fields, files };
}

/** Emails are a courtesy on top of the inbox; a request is never lost because mail is not set up. */
export async function notifyTeam(r: SupportRequest, inboxUrl: string, followUp?: string): Promise<boolean> {
  if (!mailConfigured()) return false;
  const team = supportTeam();
  if (!team.length) return false;
  const body = `**${followUp ? "Follow-up from" : "New help request from"} ${r.email}**\n\nTopic: ${topicLabel(r.topic)}\nSubject: ${r.subject}\n\n${followUp ?? r.message}\n\nReply to this email to answer, or answer in the support inbox: ${inboxUrl}`;
  try {
    for (const to of team)
      await sendMail({
        to,
        subject: `${followUp ? "Re: " : "[Help] "}${ticketNo(r)} ${r.subject}`,
        html: letterHtml(body, { name: "Jollof Pages support", footer: "Sent from the Help page in the studio." }),
        text: letterText(body),
        fromName: "Jollof Pages Help",
        fromLocal: "help",
        replyTo: r.email,
      });
    return true;
  } catch {
    return false;
  }
}

export async function notifyWriter(r: SupportRequest, text: string, helpUrl: string, kind: "received" | "answer"): Promise<boolean> {
  if (!mailConfigured() || !r.email) return false;
  const body =
    kind === "received"
      ? `Thanks for writing in. Your ticket ${ticketNo(r)} about **${r.subject}** is open, and we will answer within one working day, usually sooner.\n\nFollow it, add details or screenshots on your ticket in the studio: ${helpUrl}`
      : `${text}\n\nTo answer, open your ticket in the studio: ${helpUrl}`;
  try {
    await sendMail({
      to: r.email,
      subject: kind === "received" ? `Ticket ${ticketNo(r)} opened: ${r.subject}` : `Re: ${ticketNo(r)} ${r.subject}`,
      html: letterHtml(body, { name: "Jollof Pages", footer: "You are getting this because you asked for help in the Jollof Pages studio." }),
      text: letterText(body),
      fromName: "Jollof Pages Help",
      fromLocal: "help",
      replyTo: SUPPORT_ADDRESS,
    });
    return true;
  } catch {
    return false;
  }
}

/** Lets the team know about a new feature request. */
export async function notifyTeamOfIdea(from: string, title: string, details: string, url: string): Promise<void> {
  if (!mailConfigured()) return;
  const body = `**New feature request from ${from}**\n\n**${title}**\n\n${details || "(no details)"}\n\nSee every request and set its status: ${url}`;
  for (const to of supportTeam())
    await sendMail({
      to,
      subject: `[Idea] ${title}`,
      html: letterHtml(body, { name: "Jollof Pages", footer: "Sent from Feature requests in the studio." }),
      text: letterText(body),
      fromName: "Jollof Pages Ideas",
      fromLocal: "help",
      replyTo: from,
    }).catch(() => undefined);
}
