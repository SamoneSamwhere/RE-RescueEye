import type { LucideIcon } from 'lucide-react'
import { Plane, ScanEye, Users, BellRing, ArrowUpRight, Check } from 'lucide-react'
import { Reveal } from './Reveal'
import { AmbientBackground } from './AmbientBackground'
import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogClose,
  MorphingDialogTitle,
  MorphingDialogDescription,
} from '../ui'

interface Capability {
  icon: LucideIcon
  title: string
  description: string
  details: string
  highlights: string[]
}

const CAPABILITIES: Capability[] = [
  {
    icon: Plane,
    title: 'Drone Monitoring',
    description:
      'Stream and review live and archived drone feeds across active incidents from a single operational view.',
    details:
      'Bring every registered drone into one command view — connect a unit, pull its live feed, or drop in recorded footage, and it all lands in the same operational timeline your team already works from.',
    highlights: [
      'Live and recorded feeds side by side, per drone',
      'Connection status at a glance across the fleet',
      'Captured footage flows straight into AI review',
    ],
  },
  {
    icon: ScanEye,
    title: 'AI Detection',
    description:
      'Automatically surface people and hazards in aerial footage, with confidence scoring for rapid human review.',
    details:
      'Every captured frame is scanned automatically, surfacing casualties and structural damage with a confidence score attached — so your reviewers spend their time judging, not searching.',
    highlights: [
      'Confidence-scored detections, ranked by urgency',
      'Verify or reject in one motion — nothing auto-confirms',
      'Verified detections become trackable incidents instantly',
    ],
  },
  {
    icon: Users,
    title: 'Team Coordination',
    description:
      'Assign field responders to missions, track status in real time, and keep every unit aligned with command.',
    details:
      'Dispatch the nearest available responder to a confirmed incident and watch the mission move through acceptance, en route, on-site, and completion — command and field always looking at the same status.',
    highlights: [
      'Distance-aware responder suggestions per incident',
      'Live mission status from dispatch to completion',
      'Reassignment handled automatically on a decline',
    ],
  },
  {
    icon: BellRing,
    title: 'Real-Time Alerts',
    description:
      'Push priority notifications the moment a detection or incident status changes, so nothing goes unnoticed.',
    details:
      'Detections, incident escalations, and mission status changes push out the moment they happen — as an SMS to field responders and an in-app alert for command staff, so nobody has to go looking.',
    highlights: [
      'Priority alerts the instant status changes',
      'SMS to responders, in-app to command staff',
      'A running feed of everything that just happened',
    ],
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
          {CAPABILITIES.map(({ icon: Icon, title, description, details, highlights }, index) => (
            <Reveal key={title} delayMs={index * 90}>
              <MorphingDialog
                transition={{
                  type: 'spring',
                  bounce: 0.02,
                  duration: 0.18,
                }}
              >
                <MorphingDialogTrigger
                  style={{ borderRadius: '0.5rem' }}
                  className="group relative flex h-full w-full flex-col gap-4 overflow-hidden border border-border bg-surface p-6 shadow-panel transition-all duration-300 hover:-translate-y-1 hover:border-accent-border hover:shadow-modal"
                >
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
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span
                      aria-hidden="true"
                      className="h-1 w-10 rounded-full bg-accent/20 transition-all duration-300 group-hover:w-20 group-hover:bg-accent"
                    />
                    <span className="flex items-center gap-1 text-xs font-medium text-foreground-muted opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      Details
                      <ArrowUpRight className="size-3.5" />
                    </span>
                  </div>
                </MorphingDialogTrigger>

                <MorphingDialogContainer>
                  <MorphingDialogContent
                    style={{ borderRadius: '1rem' }}
                    className="pointer-events-auto relative flex h-auto w-full max-w-md flex-col overflow-hidden border border-border bg-surface shadow-modal"
                  >
                    <div className="p-6">
                      <span className="inline-flex size-11 items-center justify-center rounded-md bg-accent-subtle text-accent">
                        <Icon className="size-5" />
                      </span>
                      <MorphingDialogTitle className="mt-4 text-xl font-semibold text-foreground">
                        {title}
                      </MorphingDialogTitle>
                      <MorphingDialogDescription
                        disableLayoutAnimation
                        variants={{
                          initial: { opacity: 0, scale: 0.8, y: 40 },
                          animate: { opacity: 1, scale: 1, y: 0 },
                          exit: { opacity: 0, scale: 0.8, y: 40 },
                        }}
                      >
                        <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{details}</p>
                        <ul className="mt-4 flex flex-col gap-2.5">
                          {highlights.map((highlight) => (
                            <li key={highlight} className="flex items-start gap-2 text-sm text-foreground-secondary">
                              <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                              {highlight}
                            </li>
                          ))}
                        </ul>
                      </MorphingDialogDescription>
                    </div>
                    <MorphingDialogClose className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-surface-secondary hover:text-foreground" />
                  </MorphingDialogContent>
                </MorphingDialogContainer>
              </MorphingDialog>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
