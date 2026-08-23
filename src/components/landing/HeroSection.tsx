import { Link } from 'react-router-dom'
import { ArrowRight, PlayCircle } from 'lucide-react'
import { ROUTES } from '../../routes/paths'
import { Button } from '../ui'
import { cn } from '../../lib/cn'
import { useInView } from '../../hooks/useInView'
import { HeroBackground } from './HeroBackground'
import droneImage from '../../assets/drone.png'

export function HeroSection() {
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.1 })

  // The pre-reveal (hidden) state is gated by motion-safe: — a real CSS
  // media query — rather than a JS prefers-reduced-motion check. See
  // Reveal.tsx for why: some privacy-hardened browsers spoof JS
  // matchMedia() results for that feature without affecting actual CSS
  // media-query evaluation.
  function enterClass() {
    return cn(
      'motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out',
      !inView && 'motion-safe:translate-y-5 motion-safe:opacity-0',
      inView && 'translate-y-0 opacity-100',
    )
  }

  function enterStyle(delayMs: number) {
    return { transitionDelay: `${delayMs}ms` }
  }

  return (
    <section className="relative overflow-hidden bg-surface-inverse">
      <HeroBackground />

      <div
        ref={ref}
        className="relative mx-auto flex max-w-7xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24 lg:px-8"
      >
        <span
          className={cn(
            'mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-wide text-foreground-inverse/70',
            enterClass(),
          )}
          style={enterStyle(0)}
        >
          AI-assisted disaster response
        </span>

        {/* Headline + drone sandwich: identical heading text rendered as two
            layers so real words sit visually behind and in front of the
            drone artwork. The layered spans are decorative duplicates of the
            sr-only heading below, kept in sync manually since they must
            split mid-phrase for the visual effect. */}
        <h1 className="sr-only">RescueEye sees through the chaos to find every survivor</h1>
        <div
          className={cn('relative flex w-full max-w-4xl flex-col items-center', enterClass())}
          style={enterStyle(120)}
          aria-hidden="true"
        >
          <span className="relative z-10 text-[2.5rem] font-bold leading-[0.95] tracking-tight text-foreground-inverse sm:text-6xl lg:text-7xl">
            SEES THROUGH
          </span>

          <div className="relative -my-6 h-[9rem] w-full max-w-xl sm:-my-10 sm:h-[13rem] lg:h-[16rem]">
            <div className="absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 motion-safe:animate-drone-flight">
              <img
                src={droneImage}
                alt=""
                className={cn(
                  'w-[18rem] max-w-none drop-shadow-[0_25px_45px_rgba(0,0,0,0.55)] sm:w-[24rem] lg:w-[30rem]',
                  'motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out',
                  !inView && 'motion-safe:scale-90 motion-safe:opacity-0',
                  inView && 'scale-100 opacity-100',
                )}
                style={enterStyle(220)}
              />
            </div>
          </div>

          <span className="relative z-30 text-[2.5rem] font-bold leading-[0.95] tracking-tight text-foreground-inverse sm:text-6xl lg:text-7xl">
            THE CHAOS
          </span>
        </div>

        <p
          className={cn(
            'relative z-30 mt-8 max-w-2xl text-base text-foreground-inverse/70 sm:text-lg',
            enterClass(),
          )}
          style={enterStyle(320)}
        >
          RescueEye fuses live drone imagery with real-time AI detection to help command staff
          find survivors faster, coordinate teams, and make confident decisions under pressure.
        </p>

        <div
          className={cn('relative z-30 mt-8 flex flex-col gap-3 sm:flex-row', enterClass())}
          style={enterStyle(420)}
        >
          <Link
            to={ROUTES.signup}
            className="inline-block transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Button size="lg" className="gap-2 px-6">
              Register Agency
              <ArrowRight className="size-4" />
            </Button>
          </Link>
          <a
            href="#workflow"
            className="inline-block transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-white/25 px-6 text-foreground-inverse hover:bg-white/10"
            >
              <PlayCircle className="size-4" />
              See how it works
            </Button>
          </a>
        </div>
      </div>
    </section>
  )
}
