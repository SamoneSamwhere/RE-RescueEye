import type { IncidentPriority } from '../../../types/incident'
import { cn } from '../../../lib/cn'

interface PriorityBadgeProps {
  priority: IncidentPriority
  className?: string
}

const LABEL: Record<IncidentPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
}

const BADGE_CLASSES: Record<IncidentPriority, string> = {
  LOW: 'border-priority-low-border bg-priority-low-bg text-priority-low-fg',
  MEDIUM: 'border-priority-medium-border bg-priority-medium-bg text-priority-medium-fg',
  HIGH: 'border-priority-high-border bg-priority-high-bg text-priority-high-fg',
  CRITICAL: 'border-priority-critical-border bg-priority-critical-bg text-priority-critical-fg',
}

const DOT_CLASSES: Record<IncidentPriority, string> = {
  LOW: 'bg-priority-low',
  MEDIUM: 'bg-priority-medium',
  HIGH: 'bg-priority-high',
  CRITICAL: 'bg-priority-critical',
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        BADGE_CLASSES[priority],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', DOT_CLASSES[priority])} />
      {LABEL[priority]}
    </span>
  )
}
