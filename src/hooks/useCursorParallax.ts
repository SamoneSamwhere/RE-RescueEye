import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * Sets `--mx`/`--my` (each roughly -0.5..0.5) on the background element as the
 * cursor moves over its owning section, throttled to one update per frame.
 * Descendants read the vars via `calc(var(--mx, 0) * Npx)` in their own
 * transform, which the browser re-evaluates without a React re-render.
 *
 * Deliberately does NOT gate listener attachment on
 * `matchMedia('(prefers-reduced-motion: reduce)')` or `(pointer: fine)`.
 * Privacy-hardened browsers (Brave's anti-fingerprinting in particular) are
 * known to spoof JS `matchMedia()` results for exactly these media features
 * while leaving the real CSS media-query engine untouched — so a JS-side
 * check here can silently disable the effect even though the user never
 * asked for reduced motion. Instead, consumers gate the resulting transform
 * itself with the `motion-safe:` Tailwind variant (a real CSS media query),
 * so reduced-motion users still get no visible movement regardless of what
 * this hook does, and the effect can't be defeated by a spoofed JS API.
 * On touch-only devices this is harmless: without ambient hover, pointermove
 * only fires during an active touch-drag, so there's no continuous cost.
 */
export function useCursorParallax<T extends HTMLElement>(containerRef: RefObject<T | null>) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const eventTarget = container.parentElement ?? container

    let frame = 0

    function handlePointerMove(event: PointerEvent) {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const rect = eventTarget.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width - 0.5
        const y = (event.clientY - rect.top) / rect.height - 0.5
        container!.style.setProperty('--mx', x.toFixed(3))
        container!.style.setProperty('--my', y.toFixed(3))
      })
    }

    function handlePointerLeave() {
      container!.style.setProperty('--mx', '0')
      container!.style.setProperty('--my', '0')
    }

    eventTarget.addEventListener('pointermove', handlePointerMove)
    eventTarget.addEventListener('pointerleave', handlePointerLeave)
    return () => {
      eventTarget.removeEventListener('pointermove', handlePointerMove)
      eventTarget.removeEventListener('pointerleave', handlePointerLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [containerRef])
}
