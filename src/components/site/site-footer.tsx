import Link from "next/link";
import { Pattern } from "./patterns";

const COLUMNS = [
  {
    title: "The studio",
    links: [
      { href: "/#write", label: "Writing" },
      { href: "/#how", label: "Formatting" },
      { href: "/#covers", label: "Covers" },
      { href: "/#export", label: "Export" },
    ],
  },
  {
    title: "Jollof Pages",
    links: [
      { href: "/#pricing", label: "Pricing" },
      { href: "/#faq", label: "FAQ" },
      { href: "/#early-access", label: "Early access" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms and conditions" },
      { href: "/privacy", label: "Privacy policy" },
    ],
  },
];

export function SiteFooter({ name, email }: { name: string; email?: string }) {
  return (
    <footer className="relative overflow-hidden border-t-[10px] border-bonnet bg-[#1f0a05] text-cream">
      <Pattern id="p-footer" kind="wax" color="var(--char)" opacity={0.6} drift={false} />
      <div className="relative mx-auto max-w-[1600px] px-4 pt-20 pb-14 sm:px-8">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 lg:col-span-1">
            <p className="max-w-[26ch] text-[1.25rem] leading-snug">The book studio for non-fiction authors. Write it, format it, publish it.</p>
            {email && (
              <a href={`mailto:${email}`} className="link mt-4 inline-block font-medium">
                {email}
              </a>
            )}
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title} className="grid content-start gap-2">
              <p className="font-bold text-bonnet">{c.title}</p>
              {c.links.map((l) => (
                <Link key={l.href} href={l.href} className="link w-fit font-medium">
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>
        <p aria-hidden className="wide mt-16 pt-10 text-center text-[clamp(2.5rem,13.6vw,14.2rem)] leading-[0.8] font-bold tracking-[-0.06em] whitespace-nowrap text-jollof-2 select-none">
          {name}
        </p>
        <p className="mt-8 text-center text-cream/80">
          © {new Date().getFullYear()} {name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
