import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Pattern } from "@/components/site/patterns";
import { SectionHead } from "./parts";
import "./marketing.css";

/** Where questions about each policy go. */
export const LEGAL_EMAILS = { terms: "terms@jollofpages.com", privacy: "privacy@jollofpages.com" } as const;

export function ContactLine({ topic }: { topic: keyof typeof LEGAL_EMAILS }) {
  const email = LEGAL_EMAILS[topic];
  return <a href={`mailto:${email}`}>{email}</a>;
}

export function LegalPage({ title, sub, updated, children }: { title: string; sub: string; updated?: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader name="Jollof Pages" overHero />
      <section className="relative overflow-hidden bg-jollof pt-[clamp(8rem,16vh,11rem)] pb-[clamp(3.5rem,8vw,6rem)] text-cream">
        <Pattern id="p-legal" kind="adire" color="var(--char)" opacity={0.16} />
        <div className="relative px-4 sm:px-8">
          <SectionHead as="h1" title={title} sub={sub} />
          {updated && <p className="t-small mt-6 text-center text-cream/85">Last updated {updated}</p>}
        </div>
      </section>
      <main className="bg-ground py-[clamp(3rem,8vw,6rem)]">
        <article className="legal mx-auto max-w-[760px] px-4 sm:px-8">{children}</article>
      </main>
      <SiteFooter name="Jollof Pages" />
    </>
  );
}
