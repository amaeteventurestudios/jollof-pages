import { NextResponse } from "next/server";
import { bearer } from "@/lib/server/load-book";
import { adminPb, caller, withUserLock } from "@/lib/server/credits";
import { emailQuota, spendExtraEmails } from "@/lib/server/email-quota";
import { planSend } from "@/lib/email-quota";
import { letterHtml, letterText, mailConfigured, sendBatch, sendMail, type Mail } from "@/lib/server/mail";
import { hasPro, rootDomain, siteLabel } from "@/lib/sites";
import type { SiteSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Newsletter {
  id: string;
  owner: string;
  subject: string;
  body: string;
  status: string;
}

const unsubUrl = (token: string) => `https://${rootDomain()}/unsubscribe?t=${token}`;

/** POST { id, test? }: sends a newsletter draft to the author's reader list (or, with test, to the author). */
export async function POST(req: Request) {
  const me = await caller(bearer(req));
  if (!me) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!mailConfigured()) return NextResponse.json({ error: "Sending email is not set up on the server yet." }, { status: 503 });
  const { id, test } = (await req.json().catch(() => ({}))) as { id?: string; test?: boolean };
  const pb = await adminPb();
  const letter = await pb.collection("newsletters").getOne<Newsletter>(String(id ?? "")).catch(() => null);
  if (!letter || letter.owner !== me.id) return NextResponse.json({ error: "Newsletter not found." }, { status: 404 });
  if (letter.status !== "draft") return NextResponse.json({ error: "This newsletter has already been sent." }, { status: 400 });
  if (!letter.subject.trim() || !letter.body.trim()) return NextResponse.json({ error: "Add a subject and some words first." }, { status: 400 });
  const site = await pb
    .collection("site_settings")
    .getFirstListItem<SiteSettings>(pb.filter("owner = {:o}", { o: me.id }))
    .catch(() => null);
  if (!hasPro(site)) return NextResponse.json({ error: "Newsletters come with Author Site Pro." }, { status: 402 });

  const name = site?.publisher_name || "An author";
  const make = (to: string, token?: string): Mail => {
    const u = token ? unsubUrl(token) : undefined;
    return {
      to,
      subject: letter.subject,
      html: letterHtml(letter.body, { name, accent: site?.design?.palette?.hero, footer: `You joined ${name}'s reader list at ${siteLabel(site)}.`, unsubscribeUrl: u }),
      text: letterText(letter.body, u),
      fromName: name,
      fromLocal: site?.subdomain,
      replyTo: site?.email || me.email,
      unsubscribeUrl: u,
    };
  };

  try {
    if (test) {
      await sendMail({ ...make(me.email), subject: `[Test] ${letter.subject}` });
      return NextResponse.json({ test: true, to: me.email });
    }
    const readers = await pb
      .collection("subscribers")
      .getFullList<{ email: string; token: string }>({ filter: pb.filter("owner = {:o} && unsubscribed != true", { o: me.id }), fields: "email,token" });
    if (!readers.length) return NextResponse.json({ error: "Your reader list is empty so far." }, { status: 400 });
    // one send at a time per author, so two quick clicks cannot both fit in the same allowance
    return await withUserLock(`mail:${me.id}`, async () => {
      const quota = await emailQuota(me);
      const plan = planSend(quota, readers.length);
      if (!plan.ok)
        return NextResponse.json(
          {
            error: `This send needs ${readers.length.toLocaleString("en-US")} emails and you have ${(readers.length - plan.short).toLocaleString("en-US")} left. Buy more emails on the Readers page, or wait until your allowance refills on ${quota.resets}.`,
            quota,
          },
          { status: 402 },
        );
      await pb.collection("newsletters").update(letter.id, { status: "sending", recipients: readers.length });
      let sent = 0;
      // what the sent emails cost beyond the allowance, settled however the send ends
      const settle = async () => {
        const fromExtra = Math.max(0, sent - plan.fromAllowance);
        await spendExtraEmails(me.id, fromExtra, letter.id);
        return fromExtra;
      };
      try {
        for (let i = 0; i < readers.length; i += 100) {
          await sendBatch(readers.slice(i, i + 100).map((r) => make(r.email, r.token)));
          sent += Math.min(100, readers.length - i);
        }
        const fromExtra = await settle();
        await pb.collection("newsletters").update(letter.id, { status: "sent", sent_count: sent, from_extra: fromExtra, sent_at: new Date().toISOString().replace("T", " ") });
        return NextResponse.json({ sent });
      } catch (e) {
        const fromExtra = await settle().catch(() => 0);
        await pb.collection("newsletters").update(letter.id, { status: "failed", sent_count: sent, from_extra: fromExtra, sent_at: new Date().toISOString().replace("T", " "), error: e instanceof Error ? e.message : String(e) });
        throw e;
      }
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
