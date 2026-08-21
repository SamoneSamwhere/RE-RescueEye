import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ROUTES } from '../../routes/paths'
import { Button } from '../ui'
import { useCursorParallax } from '../../hooks/useCursorParallax'
import { Reveal } from './Reveal'

export function CtaSection() {
  const containerRef = useRef<HTMLElement>(null)
  useCursorParallax(containerRef)

  return (
    <section ref={containerRef} className="relative overflow-hidden bg-surface-inverse">
      <div
        className="pointer-events-none absolute inset-0 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:[transform:translate3d(calc(var(--mx,0)*16px),calc(var(--my,0)*16px),0)]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 60% 80% at 50% 100%, color-mix(in srgb, var(--color-accent) 30%, transparent), transparent 70%)',
        }}
        aria-hidden="true"
      />
      <Reveal className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground-inverse sm:text-3xl">
          Give your rescue teams an eye in the sky
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-foreground-inverse/70 sm:text-base">
          Bring your agency onto RescueEye and coordinate drone monitoring, AI detection, and field
          teams from one command view.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to={ROUTES.signup}
            className="inline-block transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Button size="lg" className="gap-2 px-6">
              Get Started
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <Link
            to={ROUTES.login}
            className="inline-block transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Button
              size="lg"
              variant="outline"
              className="border-white/25 px-6 text-foreground-inverse hover:bg-white/10"
            >
              Login to your agency
            </Button>
          </Link>
        </div>
      </Reveal>
    </section>
  )
}
