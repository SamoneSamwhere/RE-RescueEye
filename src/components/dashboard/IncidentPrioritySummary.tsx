import type { IncidentPriority } from '../../types/incident'
import { Panel } from '../ui'
import { cn } from '../../lib/cn'

interface IncidentPrioritySummaryProps {
  counts: Record<IncidentPriority, number>
}

const ORDER: IncidentPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

const LABEL: Record<IncidentPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

const DOT_CLASSES: Record<IncidentPriority, string> = {
  LOW: 'bg-priority-low',
  MEDIUM: 'bg-priority-medium',
  HIGH: 'bg-priority-high',
  CRITICAL: 'bg-priority-critical',
}

export function IncidentPrioritySummary({ counts }: IncidentPrioritySummaryProps) {
  return (
    <Panel title="Incident Priority">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ORDER.map((priority) => (
          <div
            key={priority}
            className="flex flex-col items-start gap-1 rounded-md border border-border px-3 py-2"
          >
            <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-foreground-secondary">
              <span className={cn('size-1.5 rounded-full', DOT_CLASSES[priority])} />
              {LABEL[priority]}
            </span>
            <span className="text-xl font-semibold text-foreground">{counts[priority]}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}
