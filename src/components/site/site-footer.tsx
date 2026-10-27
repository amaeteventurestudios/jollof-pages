import Link from "next/link";
import { Pattern } from "./patterns";

export function SiteFooter({ name, email }: { name: string; email?: string }) {
  return (
    <footer className="relative overflow-hidden border-t-[10px] border-bonnet bg-[#1f0a05] text-cream">
      <Pattern id="p-footer" kind="wax" color="var(--char)" opacity={0.6} drift={false} />
      <div className="relative mx-auto max-w-[1600px] px-4 pt-20 pb-14 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-[1.4fr_1fr_1fr]">
          <p className="max-w-[28ch] text-[1.25rem] leading-snug">Independent non-fiction, written, typeset and published in our own studio.</p>
          <nav aria-label="Footer" className="grid content-start gap-2 font-medium">
            <Link href="/books" className="link">
              Books
            </Link>
            <Link href="/#studio" className="link">
              The studio
            </Link>
            <Link href="/#reader-list" className="link">
              Reader list
            </Link>
            <Link href="/studio" className="link">
              Author sign-in
            </Link>
          </nav>
          <div className="grid content-start gap-2">
            {email && (
              <a href={`mailto:${email}`} className="link font-medium">
                {email}
              </a>
            )}
            <p className="text-cream/80">© {new Date().getFullYear()} {name}</p>
          </div>
        </div>
        <p aria-hidden className="wide mt-16 border-t border-cream/15 pt-10 text-[clamp(2.5rem,13.6vw,14.2rem)] leading-[0.8] font-bold tracking-[-0.06em] whitespace-nowrap text-jollof-2 select-none">
          {name}
        </p>
      </div>
    </footer>
  );
}
