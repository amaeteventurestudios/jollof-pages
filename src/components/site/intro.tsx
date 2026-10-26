import { Pattern } from "./patterns";

/** The lid lifts: a red cover with the name that rises away on the first visit of a session. */
export function Intro({ name }: { name: string }) {
  const words = name.split(/\s+/);
  return (
    <div className="intro pointer-events-none fixed inset-0 z-[70] place-items-center bg-jollof text-cream" aria-hidden>
      <Pattern id="p-intro" kind="adire" color="var(--char)" opacity={0.25} drift={false} />
      <div className="relative text-center">
        <p className="wide flex gap-[0.25em] overflow-hidden text-[clamp(3rem,12vw,10rem)] leading-[0.9] font-bold tracking-[-0.05em]">
          {words.map((w, i) => (
            <span key={i} className="intro-word inline-block" style={{ ["--i" as string]: i }}>
              {w}
            </span>
          ))}
        </p>
        <div className="intro-bar mx-auto mt-6 h-1 w-40 origin-left bg-bonnet" />
      </div>
    </div>
  );
}
