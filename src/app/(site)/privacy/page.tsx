import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Jollof Pages collects, why, and the choices you have.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" sub="What we collect, why we keep it, and your choices." updated="27 October 2026">
      <p>
        This policy explains how Jollof Pages (&ldquo;we&rdquo;, &ldquo;us&rdquo;) handles personal information when you visit this website, join the early-access list or use the Jollof
        Pages studio. The short version: we collect little, we never sell it, and your books are yours.
      </p>

      <h2>What we collect</h2>
      <h3>When you join a list</h3>
      <p>Your email address, the list you joined (for example early access or a book&apos;s reader list) and when you joined.</p>
      <h3>When you have an account</h3>
      <ul>
        <li>Your name and email address, and your password, which is stored only in a hashed form we cannot read.</li>
        <li>What you write and upload: manuscripts, chapters, images, covers, pen names and their biographies and photographs, and the settings for each book.</li>
        <li>Your writing activity, such as words written per day and sprint minutes, so the studio can show goals and streaks.</li>
      </ul>
      <h3>When you visit</h3>
      <p>
        Like any website, our servers receive technical information such as your IP address, browser type and the pages requested. We use it to keep the service running and secure, and keep
        these logs only for a short time.
      </p>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell, rent or trade your personal information.</li>
        <li>We do not use advertising or cross-site tracking cookies.</li>
        <li>We do not read your manuscripts except when you ask us to help with a problem, or when the law requires it.</li>
        <li>We do not use your books to train artificial intelligence models.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To run the studio for you: saving your work, building your files and showing your book pages.</li>
        <li>To send the emails you asked for, such as early-access news or a new book from an author you follow.</li>
        <li>To send messages about your account and important changes to the service.</li>
        <li>To protect the service from abuse and fix problems.</li>
      </ul>
      <p>
        Where the law asks us to name a legal basis, we rely on performing our agreement with you (running your account), your consent (mailing lists, which you can leave at any time) and our
        legitimate interest in keeping the service secure.
      </p>

      <h2>Storage on your device</h2>
      <p>
        The site stores a few small items in your browser: whether you prefer light or dark mode, whether you have already seen the opening animation this visit, and, if you sign in, the token
        that keeps you signed in. None of them track you across other websites.
      </p>

      <h2>Where your information is kept</h2>
      <p>
        Your account and books are stored on servers we run and control. Information may be processed in countries other than your own; where it is, we protect it as this
        policy describes. Book pages you choose to publish, and the pen names on them, are public by design.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account and books for as long as your account is open. When you delete a book or your account, we delete it from the live service straight away and from backups within 30
        days. List sign-ups are kept until you unsubscribe or ask us to remove them.
      </p>

      <h2>Who we share it with</h2>
      <p>
        Only the providers we need to run the service, such as the company that hosts our servers and the service that delivers our email, under agreements that let them use it only on our
        behalf. We will also disclose information if the law requires it or to protect the rights and safety of our users.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>Leave any mailing list using the link in our emails, or by writing to us.</li>
        <li>Download your books at any time from the studio, as a full backup or as Word files.</li>
        <li>Ask to see, correct or delete the personal information we hold about you.</li>
        <li>Object to how we use it, or complain to your local data protection authority.</li>
      </ul>
      <p>
        To use any of these rights, write to us at <ContactLine />. We will answer within 30 days.
      </p>

      <h2>Children</h2>
      <p>The service is not meant for children under 13, and we do not knowingly collect their information. If you believe a child has given us information, contact us and we will delete it.</p>

      <h2>Changes</h2>
      <p>
        If we change this policy we will update the date at the top of the page, and tell account holders by email about any meaningful change. Please also read our{" "}
        <Link href="/terms">terms and conditions</Link>.
      </p>
    </LegalPage>
  );
}
