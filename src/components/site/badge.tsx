/** A round stamp whose words turn slowly around the rim. */
export function Badge({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className} aria-hidden>
      <svg viewBox="0 0 200 200" className="spin-slow size-full">
        <defs>
          <path id="badge-ring" d="M100 100m-76 0a76 76 0 1 1 152 0a76 76 0 1 1-152 0" />
        </defs>
        <circle cx="100" cy="100" r="98" fill="var(--bonnet)" />
        <text fontSize="17" fontWeight="700" letterSpacing="3.2" fill="var(--char)">
          <textPath href="#badge-ring">{text}</textPath>
        </text>
        <path d="M100 74l6.5 19.5L126 100l-19.5 6.5L100 126l-6.5-19.5L74 100l19.5-6.5z" fill="var(--jollof)" />
      </svg>
    </div>
  );
}
