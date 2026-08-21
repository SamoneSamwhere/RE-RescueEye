import { Navigation2, Flag } from 'lucide-react'
import { Panel } from '../ui'

interface NavigationPlaceholderProps {
  distanceKm: number
  isEnRoute: boolean
}

/**
 * Stand-in for real turn-by-turn navigation — a static route sketch between
 * the responder and the incident, not a live map. Real GPS navigation is
 * explicitly out of scope for this phase.
 */
export function NavigationPlaceholder({ distanceKm, isEnRoute }: NavigationPlaceholderProps) {
  return (
    <Panel title="Navigation">
      <div
        className="relative h-40 overflow-hidden rounded-md border border-border bg-surface-secondary"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <svg className="absolute inset-0 h-full w-full">
          <line
            x1="18%"
            y1="82%"
            x2="82%"
            y2="18%"
            stroke="var(--color-border-strong)"
            strokeWidth={2}
            strokeDasharray="6 5"
          />
        </svg>
        <span className="absolute bottom-3 left-3 flex flex-col items-start gap-1">
          <span className="flex size-7 items-center justify-center rounded-full bg-accent text-foreground-inverse ring-2 ring-surface">
            <Navigation2 className="size-3.5" />
          </span>
          <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary">
            You
          </span>
        </span>
        <span className="absolute right-3 top-3 flex flex-col items-end gap-1">
          <span className="flex size-7 items-center justify-center rounded-full bg-danger text-foreground-inverse ring-2 ring-surface">
            <Flag className="size-3.5" />
          </span>
          <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-medium text-foreground-secondary">
            Incident
          </span>
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground-secondary">
        {distanceKm.toFixed(1)} km {isEnRoute ? 'remaining to' : 'to'} incident location
      </p>
      <p className="text-xs text-foreground-muted">
        Live turn-by-turn GPS navigation is not yet available in this preview.
      </p>
    </Panel>
  )
}
