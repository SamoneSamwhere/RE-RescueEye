import type { LucideIcon } from 'lucide-react'
import { Plane, ScanEye, Users, BellRing } from 'lucide-react'
import { Reveal } from './Reveal'
import { AmbientBackground } from './AmbientBackground'

interface Capability {
  icon: LucideIcon
  title: string
  description: string
}

const CAPABILITIES: Capability[] = [
  {
    icon: Plane,
    title: 'Drone Monitoring',
    description:
      'Stream and review live and archived drone feeds across active incidents from a single operational view.',
  },
  {
    icon: ScanEye,
    title: 'AI Detection',
    description:
      'Automatically surface people and hazards in aerial footage, with confidence scoring for rapid human review.',
  },
  {
    icon: Users,
    title: 'Team Coordination',
    description:
      'Assign field responders to missions, track status in real time, and keep every unit aligned with command.',
  },
  {
    icon: BellRing,
    title: 'Real-Time Alerts',
    description:
      'Push priority notifications the moment a detection or incident status changes, so nothing goes unnoticed.',
  },
]

export function CapabilitiesGrid() {
  return (
    <section id="capabilities" className="relative overflow-hidden bg-background">
      <AmbientBackground />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">Capabilities</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Everything command staff need in one platform
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-foreground-secondary sm:text-base">
            One operational view for seeing the situation, validating what matters, and moving
            the right people into action.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map(({ icon: Icon, title, description }, index) => (
            <Reveal key={title} delayMs={index * 90}>
              <div className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-lg border border-border bg-surface p-6 shadow-panel transition-all duration-300 hover:-translate-y-1 hover:border-accent-border hover:shadow-modal">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-px bg-accent motion-safe:animate-capability-scan"
                  style={{ animationDelay: `${index * 0.7}s` }}
                />
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex size-10 items-center justify-center rounded-md bg-accent-subtle text-accent transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs font-medium text-foreground-muted">
                    0{index + 1}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
                    {description}
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="mt-auto h-1 w-10 rounded-full bg-accent/20 transition-all duration-300 group-hover:w-20 group-hover:bg-accent"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
