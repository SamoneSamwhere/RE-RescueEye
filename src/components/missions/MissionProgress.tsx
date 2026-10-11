import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { MissionStatus } from '../../types/mission'

const STEPS: Array<{ status: MissionStatus; label: string }> = [
  { status: 'ACCEPTED', label: 'Accepted' },
  { status: 'EN_ROUTE', label: 'En Route' },
  { status: 'ON_SITE', label: 'On Site' },
  { status: 'COMPLETED', label: 'Cleared' },
]

/**
 * Where a responder is in their mission, as four steps. Done steps are
 * filled and checked, the current one is ringed, the rest are outlined — so
 * "what's next" reads at a glance without parsing a status badge.
 */
export function MissionProgress({ status }: { status: MissionStatus }) {
  const current = STEPS.findIndex((s) => s.status === status)

  return (
    <ol className="grid grid-cols-4" aria-label="Mission progress">
      {STEPS.map((step, i) => {
        const done = i < current || status === 'COMPLETED'
        const active = i === current && status !== 'COMPLETED'
        return (
          <li key={step.status} className="relative flex flex-col items-center gap-1.5" aria-current={active ? 'step' : undefined}>
            {i > 0 ? (
              <span
                className={cn('absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2', i <= current ? 'bg-accent' : 'bg-border')}
                aria-hidden="true"
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex size-6 items-center justify-center rounded-full border-2 text-[10px] font-semibold',
                done && 'border-accent bg-accent text-foreground-inverse',
                active && 'border-accent bg-surface text-accent ring-4 ring-accent/20',
                !done && !active && 'border-border bg-surface text-foreground-muted',
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cn('text-[11px] font-medium', done || active ? 'text-foreground' : 'text-foreground-muted')}>
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
