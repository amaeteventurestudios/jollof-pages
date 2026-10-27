import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { Pattern } from "@/components/site/patterns";
import { SectionHead } from "./parts";
import "./marketing.css";

/** Where legal questions go. Empty until the address is chosen; the pages then say so plainly. */
export const LEGAL_EMAIL = "";

export function ContactLine() {
  return LEGAL_EMAIL ? (
    <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>
  ) : (
    <span className="bg-bonnet/40 px-1 font-semibold">our contact address, which will be published on this page shortly</span>
  );
}

export function LegalPage({ title, sub, updated, children }: { title: string; sub: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <SiteHeader name="Jollof Pages" overHero />
      <section className="relative overflow-hidden bg-jollof pt-[clamp(8rem,16vh,11rem)] pb-[clamp(3.5rem,8vw,6rem)] text-cream">
        <Pattern id="p-legal" kind="adire" color="var(--char)" opacity={0.16} />
        <div className="relative px-4 sm:px-8">
          <SectionHead as="h1" title={title} sub={sub} />
          <p className="t-small mt-6 text-center text-cream/85">Last updated {updated}</p>
        </div>
      </section>
      <main className="bg-ground py-[clamp(3rem,8vw,6rem)]">
        <article className="legal mx-auto max-w-[760px] px-4 sm:px-8">{children}</article>
      </main>
      <SiteFooter name="Jollof Pages" />
    </>
  );
}
