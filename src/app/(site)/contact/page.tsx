import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LEGAL_EMAILS } from "@/components/marketing/legal-page";
import { SUPPORT_TOPICS } from "@/lib/support";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Questions about writing, formatting for Amazon KDP, covers, your author website or payments? Email the Jollof Pages team or open a help request in the Desk.",
  alternates: { canonical: "/contact" },
};

const SUPPORT = "support@jollofpages.com";

export default function ContactPage() {
  return (
    <LegalPage title="Contact us" sub="We read every message, and a person replies.">
      <h2>Have an account?</h2>
      <p>
        The fastest way is <Link href="/desk/help">Help in the Desk</Link>. Your request is tied to your account, you can add screenshots, and you&rsquo;ll see our reply there and by
        email.
      </p>
      <h2>Email us</h2>
      <p>Pick what it&rsquo;s about and your email app opens with the subject filled in.</p>
      <ul className="!list-none !pl-0 mt-5 grid gap-3 sm:grid-cols-2">
        {SUPPORT_TOPICS.map((t) => (
          <li key={t.id} className="!mt-0 !max-w-none">
            <a
              href={`mailto:${SUPPORT}?subject=${encodeURIComponent(`Jollof Pages: ${t.label}`)}`}
              className="block h-full rounded-lg border-2 border-char/15 bg-cream px-4 py-3.5 font-semibold !no-underline transition-colors hover:border-jollof"
            >
              {t.label}
            </a>
          </li>
        ))}
      </ul>
      <p>
        Or write to <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a> directly.
      </p>
      <h2>Before you write</h2>
      <p>
        <Link href="/help">Help</Link> has a short video for every part of the Desk, and the <Link href="/#faq">FAQ</Link> answers the common questions about pricing, KDP and covers.
      </p>
      <h2>Legal and privacy</h2>
      <p>
        Terms questions go to <a href={`mailto:${LEGAL_EMAILS.terms}`}>{LEGAL_EMAILS.terms}</a> and privacy requests to <a href={`mailto:${LEGAL_EMAILS.privacy}`}>{LEGAL_EMAILS.privacy}</a>.
      </p>
      <h2>Who we are</h2>
      <p>
        Jollof Pages is made by Amaete Venture Studios, which also makes <a href="https://studio.jollofpages.com">Jollof Studio</a>, a free design studio for social posts, presentations and
        covers.
      </p>
    </LegalPage>
  );
}
