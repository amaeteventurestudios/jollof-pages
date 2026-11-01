import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms and conditions",
  description: "The terms for using Jollof Pages, the writing desk for authors.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms and conditions" sub="The agreement between you and Jollof Pages." updated="27 October 2026">
      <p>
        These terms cover your use of the Jollof Pages website and the Jollof Pages studio (together, &ldquo;the service&rdquo;). By creating an account, joining the early-access list or using the
        service, you agree to them. If you do not agree, please do not use the service.
      </p>

      <h2>Who we are</h2>
      <p>
        Jollof Pages (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides an online studio for writing, formatting and preparing books for publication. You can reach us at <ContactLine topic="terms" />.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 18, or have the permission of a parent or guardian, to open an account.</li>
        <li>Keep your sign-in details private. You are responsible for what happens under your account.</li>
        <li>Give us an email address that works, so we can reach you about your account.</li>
        <li>Tell us straight away if you think someone else has used your account.</li>
      </ul>

      <h2>Your books belong to you</h2>
      <p>
        You keep every right in the words, images, covers and other material you put into the service (&ldquo;your content&rdquo;). We claim no ownership of it. You give us only the limited
        permission we need to store your content, show it back to you, turn it into the files you ask for (such as PDF, EPUB and DOCX), and, when you choose to publish a book page, display it on
        the web.
      </p>
      <p>That permission ends when you delete your content or your account, except for copies held for a short time in backups.</p>

      <h2>What you are responsible for</h2>
      <ul>
        <li>You have the right to use everything you upload, including text, photographs, fonts and cover artwork, whether you made it yourself or with a tool.</li>
        <li>Your content does not break the law or infringe anyone else&apos;s rights, and is not defamatory, hateful or harmful to children.</li>
        <li>You follow the rules of every store you publish to, including Amazon KDP&apos;s content and metadata guidelines.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Please do not misuse the service. In particular, do not:</p>
      <ul>
        <li>try to get into accounts or systems that are not yours, or probe, scan or test the service for weaknesses without our written permission;</li>
        <li>upload malware, or anything designed to disrupt or overload the service;</li>
        <li>use the service to send spam, or to collect other people&apos;s personal information without their consent;</li>
        <li>copy, resell or rebuild the service, or scrape it with automated tools.</li>
      </ul>

      <h2>Files you export</h2>
      <p>
        We build exports to the published requirements of Amazon KDP and the major ebook stores, and we check what we can before you download. Stores change their rules and review every
        submission themselves, so we cannot promise that a store will accept a particular file or book. Please review your proofs before you publish.
      </p>
      <p>Jollof Pages does not upload books to any store for you. Your store accounts, prices, royalties and the agreements you make with stores are between you and each store.</p>

      <h2>Early access and payment</h2>
      <p>
        During early access some or all of the service may be free, and features may change or be removed. When paid plans begin, the price, what it includes and the refund terms will be shown
        clearly before you pay, and will form part of these terms.
      </p>

      <h2>Availability and changes</h2>
      <p>
        We work to keep the service running and your work safe, but we cannot promise it will always be available or free of errors. Keep your own copy of anything important: you can download a
        full backup of every book from the Desk at any time. We may improve, change or stop parts of the service. If we ever close the service, we will give you reasonable notice and time to
        download your books.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can stop using the service and ask us to delete your account at any time. We may suspend or close an account that breaks these terms, and where we reasonably can, we will tell you why
        and give you a chance to download your content first.
      </p>

      <h2>Limits on our liability</h2>
      <p>
        The service is provided &ldquo;as is&rdquo;. To the extent the law allows, we are not liable for lost profits, lost sales, lost data or any indirect or consequential loss, and our total
        liability to you for any claim is limited to the amount you paid us in the twelve months before the claim, or fifty US dollars if you have paid nothing. Nothing in these terms limits
        liability that cannot be limited by law.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time. When we make a meaningful change we will update the date at the top of this page and, if you have an account, tell you by email before it
        takes effect. Using the service after that means you accept the new terms.
      </p>

      <h2>Questions</h2>
      <p>
        If anything here is unclear, write to us at <ContactLine topic="terms" />. How we handle personal information is set out in our <Link href="/privacy">privacy policy</Link>.
      </p>
    </LegalPage>
  );
}
