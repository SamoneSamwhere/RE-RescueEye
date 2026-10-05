import type { BoundingBox, DetectionCategory } from '../../../types/detection'

interface MockDetectionSceneProps {
  category: DetectionCategory
  boundingBox: BoundingBox
}

/**
 * Stand-in for a drone frame on mock detections, which have no real image.
 * Drawn as a top-down aerial view: the terrain fills the frame, and the subject
 * (a person lying on the ground, or collapsed rubble) is drawn inside the
 * bounding box so the AI box always encloses something. Illustration only — it
 * is labelled "mock" by the caller and never mistaken for real footage.
 */
export function MockDetectionScene({ category, boundingBox }: MockDetectionSceneProps) {
  const isDamage = category === 'DAMAGE'

  return (
    <div className="absolute inset-0">
      <svg viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="mock-ground" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={isDamage ? '#6b6258' : '#5d7a4a'} />
            <stop offset="1" stopColor={isDamage ? '#4a443d' : '#3f5a36'} />
          </linearGradient>
          <pattern id="mock-grain" width="4" height="4" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.35" fill="#000" opacity="0.12" />
            <circle cx="3" cy="3" r="0.3" fill="#fff" opacity="0.07" />
          </pattern>
        </defs>

        <rect width="160" height="90" fill="url(#mock-ground)" />

        {isDamage ? (
          <>
            {/* Cracked street and neighbouring lots */}
            <rect x="0" y="58" width="160" height="12" fill="#3a3733" />
            <path d="M0 64 H160" stroke="#c9b458" strokeWidth="0.6" strokeDasharray="4 3" opacity="0.7" />
            <rect x="6" y="6" width="34" height="26" fill="#7d7468" />
            <rect x="9" y="9" width="28" height="20" fill="#928878" />
            <rect x="118" y="8" width="36" height="30" fill="#7d7468" />
            <rect x="122" y="12" width="28" height="22" fill="#85796a" />
            <rect x="8" y="74" width="30" height="12" fill="#6e665b" />
            <rect x="124" y="74" width="28" height="12" fill="#6e665b" />
          </>
        ) : (
          <>
            {/* Dirt track, field patches and tree canopy */}
            <path d="M-4 70 C 40 56, 90 80, 164 62" stroke="#a08c66" strokeWidth="7" fill="none" opacity="0.85" />
            <path d="M-4 70 C 40 56, 90 80, 164 62" stroke="#8a7753" strokeWidth="0.6" fill="none" strokeDasharray="3 4" />
            <rect x="96" y="6" width="56" height="30" fill="#6f8c4f" opacity="0.8" />
            <rect x="8" y="10" width="40" height="22" fill="#49663a" opacity="0.8" />
            {[
              [20, 52, 5], [34, 46, 4], [52, 14, 6], [140, 50, 5], [150, 40, 4], [74, 8, 4], [12, 78, 5], [128, 82, 4],
            ].map(([cx, cy, r]) => (
              <g key={`${cx}-${cy}`}>
                <circle cx={cx} cy={cy} r={r} fill="#2f4a2b" />
                <circle cx={cx - r * 0.25} cy={cy - r * 0.25} r={r * 0.6} fill="#3f6338" />
              </g>
            ))}
          </>
        )}

        <rect width="160" height="90" fill="url(#mock-grain)" />
      </svg>

      {/* The subject, fitted inside the AI bounding box. */}
      <div
        className="absolute"
        style={{
          left: `${boundingBox.x}%`,
          top: `${boundingBox.y}%`,
          width: `${boundingBox.width}%`,
          height: `${boundingBox.height}%`,
        }}
      >
        {isDamage ? <RubbleSubject /> : <PersonSubject />}
      </div>
    </div>
  )
}

/** Top-down person lying on their side: head, torso, bent limbs and a cast shadow. */
function PersonSubject() {
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden="true">
      <ellipse cx="52" cy="38" rx="40" ry="9" fill="#000" opacity="0.28" />
      {/* legs */}
      <path d="M62 30 L90 24 L92 30 L66 38 Z" fill="#2c3e5c" />
      <path d="M60 36 L86 44 L83 50 L58 42 Z" fill="#26364f" />
      {/* torso */}
      <rect x="30" y="22" width="36" height="20" rx="9" fill="#c8532e" />
      {/* arms */}
      <path d="M34 24 L16 14 L12 19 L30 31 Z" fill="#b94a28" />
      <path d="M38 40 L22 50 L26 55 L42 45 Z" fill="#b94a28" />
      {/* hands */}
      <circle cx="12" cy="17" r="3" fill="#d9a77c" />
      <circle cx="24" cy="53" r="3" fill="#d9a77c" />
      {/* head */}
      <circle cx="26" cy="32" r="8.5" fill="#d9a77c" />
      <path d="M18.5 29 Q26 20 33.5 29 Q27 26 18.5 29 Z" fill="#2b211c" />
    </svg>
  )
}

/** Collapsed structure: tilted roof slabs over a pile of broken masonry. */
function RubbleSubject() {
  return (
    <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet" className="h-full w-full" aria-hidden="true">
      <ellipse cx="50" cy="40" rx="46" ry="16" fill="#000" opacity="0.3" />
      <polygon points="6,38 30,12 62,20 54,46" fill="#8c3b32" />
      <polygon points="30,12 62,20 58,28 34,22" fill="#a64a3e" />
      <polygon points="50,24 94,18 88,46 58,50" fill="#9a9184" />
      <polygon points="50,24 94,18 92,26 54,32" fill="#b9b0a2" />
      <polygon points="14,46 38,40 46,54 20,56" fill="#6c645a" />
      <polygon points="64,48 86,46 90,54 68,56" fill="#6c645a" />
      {[
        [22, 30], [44, 34], [70, 36], [38, 50], [80, 28], [58, 14],
      ].map(([cx, cy]) => (
        <rect key={`${cx}-${cy}`} x={cx} y={cy} width="5" height="3" fill="#4d473f" transform={`rotate(${(cx * 7) % 40} ${cx} ${cy})`} />
      ))}
      <path d="M40 20 L46 36 L42 44" stroke="#2c2924" strokeWidth="1" fill="none" />
    </svg>
  )
}
