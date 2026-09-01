import { cn } from '../../lib/cn'

interface DroneIllustrationProps {
  active?: boolean
  className?: string
}

/** Clean line-art quadcopter used as the primary visual on each drone card. */
export function DroneIllustration({ active = false, className }: DroneIllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      className={cn('text-foreground-secondary', active && 'text-accent', className)}
      aria-hidden="true"
    >
      {/* Arms */}
      <path
        d="M60 46 L22 24 M60 46 L98 24 M60 54 L22 76 M60 54 L98 76"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Motor hubs */}
      <circle cx="22" cy="24" r="4" fill="currentColor" />
      <circle cx="98" cy="24" r="4" fill="currentColor" />
      <circle cx="22" cy="76" r="4" fill="currentColor" />
      <circle cx="98" cy="76" r="4" fill="currentColor" />

      {/* Propellers */}
      <ellipse cx="22" cy="24" rx="16" ry="4" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <ellipse cx="98" cy="24" rx="16" ry="4" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <ellipse cx="22" cy="76" rx="16" ry="4" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <ellipse cx="98" cy="76" rx="16" ry="4" stroke="currentColor" strokeWidth="2" opacity="0.5" />

      {/* Body */}
      <rect x="46" y="42" width="28" height="18" rx="5" stroke="currentColor" strokeWidth="2.5" fill="var(--color-surface)" />

      {/* Status LED */}
      <circle cx="60" cy="51" r="2.5" fill="currentColor" className={cn(active && 'motion-safe:animate-pulse-glow')} />

      {/* Camera gimbal */}
      <path d="M56 60 L54 68 M64 60 L66 68" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="60" cy="72" r="6" stroke="currentColor" strokeWidth="2.5" fill="var(--color-surface)" />
      <circle cx="60" cy="72" r="2" fill="currentColor" opacity="0.6" />
    </svg>
  )
}
