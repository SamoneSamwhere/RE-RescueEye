/**
 * Flat, low-contrast shapes behind the sign-in / sign-up card so it is not a
 * plain slab: radar rings, a dot grid, a hexagon cluster, a dashed flight path
 * and a few crosshair marks — the search-and-rescue vocabulary of the rest of
 * the app. Solid strokes only (no gradients), kept to the edges and corners so
 * nothing sits behind the form fields, and drawn in theme tokens so it reads in
 * light and dark mode alike. Purely decorative: hidden from assistive tech and
 * never intercepts clicks.
 */
export function AuthCardDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Radar rings + sweep, bottom-left, partly off the card */}
      <svg className="absolute -bottom-24 -left-24 size-72 text-accent opacity-[0.16]" viewBox="0 0 200 200" fill="none">
        {[30, 55, 80, 98].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} stroke="currentColor" strokeWidth="1.2" />
        ))}
        <path d="M100 2V198M2 100H198" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 4" />
        <path d="M100 100L169 31" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="138" cy="70" r="3.5" fill="currentColor" />
        <circle cx="72" cy="128" r="2.5" fill="currentColor" />
      </svg>

      {/* Dot grid, top-left */}
      <svg className="absolute left-5 top-5 h-24 w-36 text-foreground-muted opacity-40" viewBox="0 0 144 96">
        {Array.from({ length: 6 }, (_, row) =>
          Array.from({ length: 9 }, (_, col) => (
            <circle key={`${row}-${col}`} cx={8 + col * 16} cy={8 + row * 16} r="1.4" fill="currentColor" />
          )),
        )}
      </svg>

      {/* Hexagon cluster, top-right (clear of the accent sliver on desktop) */}
      <svg className="absolute -top-6 right-4 size-40 text-accent opacity-[0.14] lg:right-24" viewBox="0 0 160 160" fill="none">
        {[
          [80, 40],
          [115, 60],
          [80, 80],
          [45, 60],
          [115, 100],
        ].map(([cx, cy]) => (
          <polygon
            key={`${cx}-${cy}`}
            points={`${cx},${cy - 22} ${cx + 19},${cy - 11} ${cx + 19},${cy + 11} ${cx},${cy + 22} ${cx - 19},${cy + 11} ${cx - 19},${cy - 11}`}
            stroke="currentColor"
            strokeWidth="1.4"
          />
        ))}
        <polygon points="80,58 99,69 99,91 80,102 61,91 61,69" fill="currentColor" opacity="0.5" />
      </svg>

      {/* Dashed flight path with waypoints, bottom-right */}
      <svg className="absolute bottom-6 right-6 h-28 w-56 text-accent opacity-[0.18] lg:right-24" viewBox="0 0 224 112" fill="none">
        <path
          d="M4 104C40 100 52 60 92 58S150 86 176 52 208 10 220 6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="5 6"
          strokeLinecap="round"
        />
        <circle cx="92" cy="58" r="4" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="176" cy="52" r="4" stroke="currentColor" strokeWidth="1.6" />
        <path d="M214 2L224 6L216 14Z" fill="currentColor" />
      </svg>

      {/* Crosshair marks scattered along the edges */}
      {[
        'left-[38%] top-4',
        'left-4 top-1/2',
        'bottom-5 left-[46%]',
        'right-6 top-[42%] lg:right-24',
      ].map((position) => (
        <svg key={position} className={`absolute size-4 text-foreground-muted opacity-50 ${position}`} viewBox="0 0 16 16" fill="none">
          <path d="M8 1V15M1 8H15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ))}
    </div>
  )
}
