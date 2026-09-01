import { useRef } from 'react'
import { useCursorParallax } from '../../../hooks/useCursorParallax'

/**
 * A much quieter sibling of HeroBackground for the light/theme-adaptive
 * content sections — a couple of faint accent blobs and a fine grid, all
 * token-driven (var(--color-foreground)/var(--color-accent)) so they read
 * correctly in both light and dark mode without their own overrides.
 *
 * See useCursorParallax for why the parallax transform is applied via a
 * `motion-safe:` CSS class rather than a JS-computed inline style.
 */
export function AmbientBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  useCursorParallax(containerRef)

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-24 top-0 size-[26rem] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:[transform:translate3d(calc(var(--mx,0)*22px),calc(var(--my,0)*22px),0)]">
        <div className="size-full rounded-full bg-accent/[0.07] blur-[100px]" />
      </div>

      <div className="absolute -right-24 bottom-0 size-[22rem] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:[transform:translate3d(calc(var(--mx,0)*-18px),calc(var(--my,0)*-18px),0)]">
        <div className="size-full rounded-full bg-accent/[0.06] blur-[100px]" />
      </div>

      <div
        className="absolute inset-0 opacity-[0.035] motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:[transform:translate3d(calc(var(--mx,0)*6px),calc(var(--my,0)*6px),0)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--color-foreground) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  )
}
