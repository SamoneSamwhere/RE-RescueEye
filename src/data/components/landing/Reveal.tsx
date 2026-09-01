import type { ElementType, ReactNode } from 'react'
import { cn } from '../../../lib/cn'
import { useInView } from '../../../hooks/useInView'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Stagger delay in ms, applied only when motion is allowed. */
  delayMs?: number
  /** Element type to render as — e.g. "li" when used inside a list. Defaults to "div". */
  as?: ElementType
}

/**
 * Fades + slides a section into place the first time it scrolls into view.
 *
 * The hidden (pre-reveal) state is applied entirely via `motion-safe:`
 * utility classes — a real CSS media query — rather than a JS
 * `prefers-reduced-motion` check. Some privacy-hardened browsers (Brave's
 * anti-fingerprinting, notably) spoof JS `matchMedia()` results for that
 * feature without touching actual CSS media-query evaluation, which used to
 * make this component permanently skip its "hidden" state and thus never
 * animate for those users — while still working correctly, because the
 * whole point of `motion-safe:` is that reduced-motion users only ever see
 * the plain, always-visible `opacity-100`/`translate-y-0` classes below.
 */
export function Reveal({ children, className, delayMs = 0, as: Tag = 'div' }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>()

  return (
    <Tag
      ref={ref}
      className={cn(
        'motion-safe:transition-all motion-safe:duration-[1200ms] motion-safe:ease-out',
        !inView && 'motion-safe:translate-y-12 motion-safe:opacity-0',
        inView && 'translate-y-0 opacity-100',
        className,
      )}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </Tag>
  )
}
