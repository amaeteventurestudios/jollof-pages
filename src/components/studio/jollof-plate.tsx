"use client";

/**
 * A plate of jollof rice with chicken and plantain, drawn for the import drop zone. `fill` (0 to 1)
 * heaps the rice up as a manuscript is saved; `hot` makes the steam rise (a file is over the zone).
 */
export function JollofPlate({ fill = 1, hot = false, className }: { fill?: number; hot?: boolean; className?: string }) {
  const heap = 0.18 + Math.max(0, Math.min(1, fill)) * 0.82;
  return (
    <svg viewBox="0 0 220 150" className={className} aria-hidden>
      <style>{`
        .jp-steam path { stroke-dasharray: 40; animation: jp-steam 2.4s ease-in-out infinite; opacity: .55 }
        .jp-steam path:nth-child(2) { animation-delay: .5s } .jp-steam path:nth-child(3) { animation-delay: 1s }
        .jp-hot .jp-steam path { animation-duration: 1.1s; opacity: .9 }
        .jp-heap { transition: transform .5s cubic-bezier(.2,.8,.2,1.2) }
        .jp-hot .jp-food { animation: jp-bob .9s ease-in-out infinite }
        @keyframes jp-steam { 0% { stroke-dashoffset: 40; transform: translateY(6px) } 60% { opacity: .8 } 100% { stroke-dashoffset: -40; transform: translateY(-10px); opacity: 0 } }
        @keyframes jp-bob { 50% { transform: translateY(-3px) } }
        @media (prefers-reduced-motion: reduce) { .jp-steam path, .jp-hot .jp-food { animation: none } }
      `}</style>
      <g className={hot ? "jp-hot" : undefined}>
        <g className="jp-steam" fill="none" stroke="var(--soft, #9a8f86)" strokeWidth="3" strokeLinecap="round">
          <path d="M80 34c-6-8 6-12 0-20" />
          <path d="M110 30c-6-8 6-12 0-20" />
          <path d="M140 34c-6-8 6-12 0-20" />
        </g>
        {/* the plate */}
        <ellipse cx="110" cy="118" rx="104" ry="28" fill="#2a1a14" opacity=".12" />
        <ellipse cx="110" cy="112" rx="102" ry="30" fill="#fbf7f1" stroke="#e4d9cc" strokeWidth="2" />
        <ellipse cx="110" cy="110" rx="80" ry="21" fill="#f2ebe1" />
        <g className="jp-food">
          {/* the rice heaps up from the middle of the plate */}
          <g className="jp-heap" style={{ transform: `scaleY(${heap})`, transformOrigin: "110px 112px" }}>
            <path d="M44 110c4-30 30-52 66-52s62 22 66 52c-18 9-40 12-66 12s-48-3-66-12z" fill="#c8461b" />
            <path d="M58 104c6-22 26-38 52-38s44 14 50 32" fill="none" stroke="#e0662d" strokeWidth="9" strokeLinecap="round" opacity=".7" />
            <g fill="#f4a261" opacity=".85">
              {[
                [70, 96], [84, 84], [98, 92], [112, 78], [126, 90], [140, 82], [152, 98], [92, 104], [118, 104], [134, 106], [104, 70], [76, 106],
              ].map(([x, y], i) => (
                <ellipse key={i} cx={x} cy={y} rx="3.4" ry="1.6" transform={`rotate(${(i * 37) % 180} ${x} ${y})`} />
              ))}
            </g>
            <g fill="#3f7d3a">
              <rect x="88" y="88" width="5" height="5" rx="1" />
              <rect x="124" y="96" width="5" height="5" rx="1" />
            </g>
          </g>
          {/* fried plantain */}
          <g fill="#f2b33d" stroke="#c77c1e" strokeWidth="1.5">
            <ellipse cx="46" cy="114" rx="13" ry="7" transform="rotate(-18 46 114)" />
            <ellipse cx="62" cy="122" rx="13" ry="7" transform="rotate(8 62 122)" />
          </g>
          {/* the chicken */}
          <g transform="translate(150 92) rotate(-24)">
            <rect x="26" y="8" width="20" height="7" rx="3.5" fill="#f3e6d3" />
            <circle cx="48" cy="8" r="5" fill="#f3e6d3" />
            <circle cx="48" cy="15" r="5" fill="#f3e6d3" />
            <ellipse cx="14" cy="12" rx="22" ry="15" fill="#8a3b12" />
            <ellipse cx="10" cy="8" rx="13" ry="7" fill="#b4541c" opacity=".8" />
          </g>
        </g>
      </g>
    </svg>
  );
}
