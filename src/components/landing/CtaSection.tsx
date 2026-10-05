import { useRef } from 'react'
import { useCursorParallax } from '../../../hooks/useCursorParallax'
import { Reveal } from './Reveal'
import droneVideo from '../../../assets/Drone.webm'

export function CtaSection() {
  const containerRef = useRef<HTMLElement>(null)
  useCursorParallax(containerRef)

  return (
    <section ref={containerRef} className="relative overflow-hidden bg-surface-inverse">
      {/* Background video with pan animation */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute right-[-10%] top-1/2 h-[90%] w-[65%] -translate-y-1/2 object-contain opacity-[0.35] motion-safe:animate-pan-horizontal"
        aria-hidden="true"
      >
        <source src={droneVideo} type="video/webm" />
      </video>

      {/* Animated gradient glow */}
      <div
        className="pointer-events-none absolute inset-0 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:[transform:translate3d(calc(var(--mx,0)*16px),calc(var(--my,0)*16px),0)] motion-safe:animate-pulse"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 60% 80% at 50% 100%, color-mix(in srgb, var(--color-accent) 30%, transparent), transparent 70%)',
        }}
        aria-hidden="true"
      />

      <Reveal className="relative mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground-inverse sm:text-3xl">
          Give your rescue teams an eye in the sky.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-foreground-inverse/70 sm:text-base">
          Bring your agency onto RescueEye and coordinate drone monitoring, AI detection, and field
          teams from one command view.
        </p>
      </Reveal>
    </section>
  )
}
