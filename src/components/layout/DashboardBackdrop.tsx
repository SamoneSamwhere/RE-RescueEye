import { useRef } from 'react'
import { useCursorParallax } from '../../hooks/useCursorParallax'

/** Quiet landing-inspired atmosphere for operational screens. */
export function DashboardBackdrop() {
  const backgroundRef = useRef<HTMLDivElement>(null)
  useCursorParallax(backgroundRef)

  return (
    <div
      ref={backgroundRef}
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="absolute -left-40 -top-40 size-[32rem] rounded-full bg-accent/[0.08] blur-[110px] motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:[transform:translate3d(calc(var(--mx,0)*26px),calc(var(--my,0)*26px),0)]" />
      <div className="absolute -bottom-48 -right-32 size-[28rem] rounded-full bg-info/[0.07] blur-[120px] motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:[transform:translate3d(calc(var(--mx,0)*-20px),calc(var(--my,0)*-20px),0)]" />
      <div
        className="absolute inset-0 opacity-[0.035] motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out motion-safe:[transform:translate3d(calc(var(--mx,0)*8px),calc(var(--my,0)*8px),0)]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-accent) 1px, transparent 1px), linear-gradient(to bottom, var(--color-accent) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }}
      />
      <div className="absolute left-1/2 top-0 size-[30rem] -translate-x-1/2 rounded-full border border-accent/[0.08] motion-safe:animate-float-slow" />
    </div>
  )
}