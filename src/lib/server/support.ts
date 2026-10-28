import "server-only";
import { letterHtml, letterText, mailConfigured, sendMail } from "./mail";
import { topicLabel, type SupportRequest } from "../support";

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

export function isSupport(email: string): boolean {
  return supportTeam().includes(email.toLowerCase());
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
        subject: `${followUp ? "Re: " : "[Help] "}${r.subject}`,
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
      ? `Thanks for writing in. We have your message about **${r.subject}** and will answer within one working day, usually sooner.\n\nYou can follow the conversation on the Help page in the studio: ${helpUrl}`
      : `${text}\n\nYou can reply to this email, or continue on the Help page in the studio: ${helpUrl}`;
  try {
    await sendMail({
      to: r.email,
      subject: kind === "received" ? `We got your message: ${r.subject}` : `Re: ${r.subject}`,
      html: letterHtml(body, { name: "Jollof Pages", footer: "You are getting this because you asked for help in the Jollof Pages studio." }),
      text: letterText(body),
      fromName: "Jollof Pages Help",
      fromLocal: "help",
      replyTo: supportTeam()[0],
    });
    return true;
  } catch {
    return false;
  }
}
