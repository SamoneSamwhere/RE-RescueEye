import { Reveal } from './Reveal'
import { AmbientBackground } from './AmbientBackground'

export function PurposeBand() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-surface-secondary">
      <AmbientBackground />
      <Reveal className="relative mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Our purpose</p>
        <p className="mt-3 text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
          When every minute counts, RescueEye gives command staff a live, AI-augmented view of the
          field — turning raw drone footage into actionable intelligence so rescue teams reach the
          right people, faster.
        </p>
      </Reveal>
    </section>
  )
}
