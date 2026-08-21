import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'
import { formatDateTime } from '../../lib/formatDateTime'

export interface IncidentTimelineEvent {
  icon: LucideIcon
  label: string
  detail?: string
  timestamp: string
  tone: 'ai' | 'human'
}

interface IncidentTimelineProps {
  events: IncidentTimelineEvent[]
}

export function IncidentTimeline({ events }: IncidentTimelineProps) {
  return (
    <ol className="flex flex-col">
      {events.map((event, index) => {
        const Icon = event.icon
        const isLast = index === events.length - 1
        return (
          <li key={index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-full',
                  event.tone === 'ai' ? 'bg-accent-subtle text-accent' : 'bg-success-bg text-success-fg',
                )}
              >
                <Icon className="size-3.5" />
              </span>
              {!isLast ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
            </div>
            <div className={cn('pb-4', isLast && 'pb-0')}>
              <p className="text-sm font-medium text-foreground">{event.label}</p>
              {event.detail ? <p className="text-sm text-foreground-secondary">{event.detail}</p> : null}
              <p className="text-xs text-foreground-muted">{formatDateTime(event.timestamp)}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
