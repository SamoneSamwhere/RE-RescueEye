import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: ReactNode
}

/**
 * Fades + slides each route's content in on navigation. Keyed by pathname so
 * React remounts this wrapper (not the page below it — pages keep their own
 * state as usual) on every route change, which re-triggers the CSS
 * animation. No-ops under prefers-reduced-motion via motion-safe:.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation()

  return (
    <div key={location.pathname} className="motion-safe:animate-page-in">
      {children}
    </div>
  )
}
