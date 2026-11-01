import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";
import { VIDEO_GROUPS, VIDEO_GUIDES, VIDEO_LENGTHS, videoCaptions, videoPoster, videoSrc } from "@/lib/video-guides";

export const metadata: Metadata = {
  title: "Help and video guides",
  description: "Short video guides for every Jollof Pages feature: writing, co-writing, covers, formatting for Amazon KDP, exporting, and your author website. Plus how to reach a person.",
  alternates: { canonical: "/help" },
};

const length = (s?: number) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "");

export default function HelpPage() {
  return (
    <LegalPage title="Help" sub="A short video for every part of the Desk, and a person when you need one.">
      <p>
        Already have an account? Open <Link href="/desk/help">Help in the Desk</Link> to search common questions or send us a request with screenshots. You can also{" "}
        <Link href="/contact">contact us</Link> by email, or read the <Link href="/#faq">questions people ask before buying</Link>.
      </p>
      <nav aria-label="Topics" className="mt-6 flex flex-wrap gap-2">
        {VIDEO_GROUPS.map((g) => (
          <a key={g} href={`#${slug(g)}`} className="rounded-full border-2 border-char/20 px-3.5 py-1.5 text-[0.9375rem] font-semibold !no-underline hover:border-jollof">
            {g}
          </a>
        ))}
      </nav>
      {VIDEO_GROUPS.map((g) => (
        <section key={g} id={slug(g)} aria-labelledby={`${slug(g)}-title`} className="scroll-mt-24">
          <h2 id={`${slug(g)}-title`}>{g}</h2>
          <div className="mt-5 grid gap-6 sm:grid-cols-2">
            {VIDEO_GUIDES.filter((v) => v.group === g).map((v) => (
              <figure key={v.id} id={v.id} className="scroll-mt-24">
                <video controls preload="none" poster={videoPoster(v.id)} className="aspect-video w-full rounded-lg bg-char/10" aria-label={v.title}>
                  <source src={videoSrc(v.id)} type="video/mp4" />
                  <track kind="captions" src={videoCaptions(v.id)} srcLang="en" label="English" default />
                </video>
                <figcaption className="mt-2">
                  <span className="font-bold">{v.title}</span>
                  {VIDEO_LENGTHS[v.id] ? <span className="ml-2 text-char/70">{length(VIDEO_LENGTHS[v.id])}</span> : null}
                  <span className="mt-0.5 block text-char/80">{v.summary}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
      <h2>Still stuck?</h2>
      <p>
        <Link href="/contact">Contact us</Link> and a person will reply. Tell us which book and chapter you were in and what you pressed, and send a screenshot if you can.
      </p>
    </LegalPage>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
