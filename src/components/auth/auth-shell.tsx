import Link from "next/link";
import { BrandDomain, BrandName, BrandStyle } from "@/components/brand";
import { Fraunces } from "next/font/google";
import "./auth.css";

// a bookish serif for the covers and the accent words; the rest stays Archivo
const fraunces = Fraunces({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-fraunces" });

/**
 * The frame both account pages share: a warm, moving showcase of what the Desk makes beside a
 * soft card holding the form. On phones the showcase shrinks to a header band above the card.
 */
export function AuthShell({
  title,
  accent,
  lead,
  points,
  children,
}: {
  /** Headline, with `accent` set in italic serif after it. */
  title: string;
  accent: string;
  lead: string;
  points?: React.ReactNode[];
  children: React.ReactNode;
}) {
  return (
    <main className={`auth ${fraunces.variable} grid grid-cols-[minmax(0,1fr)] gap-3 p-3 lg:grid-cols-[1.08fr_1fr] lg:gap-0`}>
      <section className="auth-show flex flex-col p-6 sm:p-9 lg:min-h-[calc(100dvh-1.5rem)] lg:p-12">
        <span className="auth-blob b1" aria-hidden />
        <span className="auth-blob b2" aria-hidden />
        <span className="auth-blob b3" aria-hidden />
        <span className="auth-grain" aria-hidden />

        {/* phones and tablets: the app's own icon and name, as on a native app's welcome screen */}
        <div className="auth-app-icon auth-rise" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
            <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
          </svg>
        </div>
        <p className="auth-app-name auth-rise d1">
          <BrandName />
        </p>
        <BrandStyle />

        <Link href="/" className="auth-brand auth-rise inline-flex items-center gap-2.5 self-start text-lg font-semibold tracking-tight">
          <span className="grid size-9 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
              <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
            </svg>
          </span>
          <BrandName />
        </Link>

        <div className="auth-copy mt-8 max-w-2xl lg:mt-auto">
          <h2 className="auth-rise d1 wide text-[clamp(2rem,1.2rem+3.2vw,4rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
            {title}{" "}
            <span className="auth-shine font-[family-name:var(--font-fraunces)] font-normal italic tracking-[-0.02em]">{accent}</span>
          </h2>
          <p className="auth-lead auth-rise d2 mt-5 max-w-md break-words text-[1.0625rem] leading-relaxed text-white/80 sm:text-lg">{lead}</p>
          {points && (
            <ul className="auth-points auth-rise d3 mt-6 flex flex-wrap gap-2">
              {points.map((p, i) => (
                <li key={i} className="rounded-full bg-white/12 px-3.5 py-1.5 text-sm text-white/90 ring-1 ring-white/20 backdrop-blur">
                  {p}
                </li>
              ))}
            </ul>
          )}
        </div>

        <BookStage />
      </section>

      <section className="auth-pane flex items-center justify-center px-1 py-6 sm:px-6 lg:px-12 lg:py-10">
        <div className="w-full max-w-[28rem]">{children}</div>
      </section>
    </main>
  );
}

/** Four of the Desk's own sample covers, fanned out and gently floating, with the e-reader preview. */
function BookStage() {
  return (
    <div className="auth-rise d4 relative mt-12 hidden lg:block" aria-hidden>
      <div className="auth-stage">
        <div className="auth-book" style={{ left: "0rem", rotate: "-9deg", animationDelay: "-1s", background: "#1f3f63" }}>
          <div className="in m-2 items-center justify-center border border-[#d9b25a]/80 text-center font-[family-name:var(--font-fraunces)] text-[#f4ead8]">
            <p className="text-[1.15rem] font-semibold leading-tight">The Long Table</p>
            <span className="my-3 h-px w-6 bg-[#d9b25a]" />
            <p className="text-[0.55rem] text-[#d9b25a]">Essays on food, family and home</p>
            <p className="mt-auto text-[0.5rem] tracking-[0.2em]">TOLA EKANEM</p>
          </div>
        </div>
        <div className="auth-book" style={{ left: "7.25rem", rotate: "-3deg", bottom: "1.25rem", animationDelay: "-3s", background: "#2c211c" }}>
          <div className="in m-2 items-center justify-center border border-[#d9b25a]/80 text-center font-[family-name:var(--font-fraunces)] text-[#f4ead8]">
            <p className="text-[1.15rem] font-semibold leading-tight">Owning Your Words</p>
            <span className="my-3 h-px w-6 bg-[#d9b25a]" />
            <p className="text-[0.55rem] text-[#d9b25a]">Self-publishing for African writers</p>
            <p className="mt-auto text-[0.5rem] tracking-[0.2em]">TOLA EKANEM</p>
          </div>
        </div>
        <div
          className="auth-book"
          style={{ left: "14.5rem", rotate: "3deg", bottom: "0.5rem", animationDelay: "-5s", background: "radial-gradient(circle, #d3801f 28%, transparent 30%) 0 0/14px 14px, #f2b632" }}
        >
          <div className="in justify-end p-0">
            <div className="bg-[#7d2711] px-3 pt-3 pb-2.5 text-white">
              <p className="text-[1.05rem] font-bold leading-[1.05]">Small Pot, Big Fire</p>
              <p className="mt-2 text-[0.5rem] text-white/80">Starting a business with what you already have</p>
              <p className="mt-2.5 text-[0.5rem] font-semibold tracking-[0.18em]">TOLA EKANEM</p>
            </div>
          </div>
        </div>
        <div className="auth-book" style={{ left: "21.75rem", rotate: "9deg", bottom: "1.5rem", animationDelay: "-2.5s", background: "linear-gradient(160deg,#c94a1e,#a1360f)" }}>
          <div className="in text-white">
            <p className="text-[1.35rem] font-bold leading-[0.95] tracking-tight">The Book Inside You</p>
            <p className="mt-3 text-[0.5rem] text-[#ffc59b]">A practical guide to writing your first non-fiction book</p>
            <p className="mt-auto text-[0.5rem] font-semibold tracking-[0.18em]">TOLA EKANEM</p>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/site/shots/kindle.webp" alt="" className="auth-device hidden 2xl:block" width={675} height={908} />

        <span className="auth-chip" style={{ left: "2%", top: "-0.75rem", animationDelay: "-1.5s" }}>
          <span className="auth-dot" /> tola.
          <BrandDomain /> is live
        </span>
        <span className="auth-chip" style={{ left: "19rem", top: "1.75rem", animationDelay: "-4s" }}>
          <svg viewBox="0 0 24 24" className="size-4 text-[#ad3a17]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Print PDF and EPUB ready
        </span>
      </div>
    </div>
  );
}

/** Small heading block at the top of the form card. */
export function AuthHeading({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <div className="auth-rise d1 mb-7">
      <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
      {sub && <p className="mt-2 text-[0.975rem] text-muted-foreground">{sub}</p>}
    </div>
  );
}
