import { useRef } from 'react'
import { useCursorParallax } from '../../hooks/useCursorParallax'

/**
 * Decorative hero backdrop: a radial glow, two drifting blobs, a faint grid,
 * a slow radar sweep, and a few pulsing "detection" blips. The glow, blobs,
 * and grid pick up a subtle parallax offset from cursor position via
 * useCursorParallax (--mx/--my custom properties) — no React re-render per
 * frame, so it stays cheap even on slower machines.
 *
 * The parallax transform itself is applied via a `motion-safe:` arbitrary
 * utility class (a real CSS media query), not a JS-computed inline style —
 * see useCursorParallax for why: some privacy-hardened browsers spoof JS
 * `matchMedia()` results for prefers-reduced-motion/pointer without
 * affecting actual CSS media-query evaluation.
 */
export function HeroBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  useCursorParallax(containerRef)

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* ambient glow — parallax only */}
      <div
        className="absolute inset-0 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:[transform:translate3d(calc(var(--mx,0)*12px),calc(var(--my,0)*12px),0)]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in srgb, var(--color-accent) 28%, transparent), transparent 70%)',
        }}
      />

      {/* drifting blob (bottom-left) — parallax wrapper + float on the inner layer, so the two transforms don't collide */}
      <div className="absolute -left-32 bottom-0 size-[28rem] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:[transform:translate3d(calc(var(--mx,0)*28px),calc(var(--my,0)*28px),0)]">
        <div className="size-full rounded-full bg-accent/20 blur-[120px] motion-safe:animate-float" />
      </div>

      {/* drifting blob (top-right) */}
      <div className="absolute -right-24 top-1/3 size-[24rem] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:[transform:translate3d(calc(var(--mx,0)*-20px),calc(var(--my,0)*-20px),0)]">
        <div className="size-full rounded-full bg-accent/15 blur-[120px] motion-safe:animate-float-slow" />
      </div>

      {/* faint grid — parallax only */}
      <div
        className="absolute inset-0 opacity-[0.07] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:[transform:translate3d(calc(var(--mx,0)*8px),calc(var(--my,0)*8px),0)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-foreground-inverse) 1px, transparent 1px), linear-gradient(to bottom, var(--color-foreground-inverse) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      {/* radar sweep, centered behind the headline */}
      <div className="absolute left-1/2 top-[38%] size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.14]">
        <div
          className="size-full rounded-full motion-safe:animate-radar-spin"
          style={{
            backgroundImage:
              'conic-gradient(from 0deg, var(--color-accent), transparent 20%, transparent 100%)',
          }}
        />
      </div>
      <div className="absolute left-1/2 top-[38%] size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
      <div className="absolute left-1/2 top-[38%] size-[20rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" />

      {/* soft cursor spotlight — the section captures movement while this layer stays non-interactive */}
      <div className="absolute left-1/2 top-1/2 size-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:[transform:translate3d(calc(-50% + var(--mx,0)*34px),calc(-50% + var(--my,0)*34px),0)]">
        <div className="size-full rounded-full bg-accent/[0.08] blur-[100px]" />
      </div>

      {/* pulsing detection blips */}
      <span className="absolute left-[18%] top-[26%] size-1.5 rounded-full bg-accent motion-safe:animate-pulse-glow" />
      <span
        className="absolute right-[20%] top-[60%] size-1.5 rounded-full bg-accent motion-safe:animate-pulse-glow"
        style={{ animationDelay: '1.1s' }}
      />
      <span
        className="absolute left-[66%] top-[18%] size-1 rounded-full bg-accent motion-safe:animate-pulse-glow"
        style={{ animationDelay: '2s' }}
      />
    </div>
  )
}
