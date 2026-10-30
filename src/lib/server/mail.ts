import "server-only";

/**
 * Email through Resend's HTTP API (resend.com; no SDK). RESEND_API_KEY, and MAIL_FROM_DOMAIN
 * for a domain verified in Resend, such as mail.jollofpages.com. Authors send as
 * "Their Name <subdomain@MAIL_FROM_DOMAIN>" with replies going to their own address.
 */

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM_DOMAIN);
}

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName: string;
  fromLocal?: string;
  replyTo?: string;
  unsubscribeUrl?: string;
}

function payload(m: Mail) {
  const local = (m.fromLocal || "books").replace(/[^a-z0-9.-]/gi, "") || "books";
  const name = m.fromName.replace(/["<>\r\n]/g, "").slice(0, 80);
  return {
    from: `"${name}" <${local}@${process.env.MAIL_FROM_DOMAIN}>`,
    to: [m.to],
    subject: m.subject,
    html: m.html,
    text: m.text,
    ...(m.replyTo ? { reply_to: m.replyTo } : {}),
    ...(m.unsubscribeUrl ? { headers: { "List-Unsubscribe": `<${m.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
  };
}

async function post(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${process.env.RESEND_API_URL || "https://api.resend.com"}/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(`Email: ${err.message ?? res.status}`);
  }
}

export async function sendMail(m: Mail): Promise<void> {
  await post("emails", payload(m));
}

/** Up to 100 per request, which is Resend's batch limit. */
export async function sendBatch(mails: Mail[]): Promise<void> {
  for (let i = 0; i < mails.length; i += 100) await post("emails/batch", mails.slice(i, i + 100).map(payload));
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * A plain letter from plain writing: blank lines make paragraphs, **bold**, *italic*, and
 * bare links or [words](https://…) become links. Nothing else is interpreted, so it is safe.
 */
export function letterHtml(body: string, o: { name: string; accent?: string; footer: string; unsubscribeUrl?: string }): string {
  const accent = /^#[0-9a-f]{6}$/i.test(o.accent ?? "") ? o.accent! : "#ad3a17";
  const inline = (t: string) =>
    esc(t)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, `<a href="$2" style="color:${accent}">$1</a>`)
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, `$1<a href="$2" style="color:${accent}">$2</a>`)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br>");
  const paras = body
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (/^#{1,3}\s/.test(p) ? `<h2 style="font-size:22px;line-height:1.25;margin:28px 0 8px">${inline(p.replace(/^#{1,3}\s/, ""))}</h2>` : `<p style="margin:0 0 16px">${inline(p)}</p>`))
    .join("\n");
  return `<!doctype html><html><body style="margin:0;background:#f6f1ea;padding:24px 12px;font-family:Georgia,'Times New Roman',serif;color:#2b2622">
<div style="max-width:600px;margin:0 auto;background:#fff;border-top:6px solid ${accent};padding:32px 28px;font-size:17px;line-height:1.6">
<p style="margin:0 0 24px;font:700 15px/1.2 Arial,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:${accent}">${esc(o.name)}</p>
${paras}
</div>
<p style="max-width:600px;margin:16px auto 0;font:13px/1.5 Arial,sans-serif;color:#7a6f66;text-align:center">${esc(o.footer)}${o.unsubscribeUrl ? `<br><a href="${esc(o.unsubscribeUrl)}" style="color:#7a6f66">Unsubscribe</a>` : ""}</p>
</body></html>`;
}

export function letterText(body: string, unsubscribeUrl?: string): string {
  return body.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)") + (unsubscribeUrl ? `\n\n--\nUnsubscribe: ${unsubscribeUrl}` : "");
}
