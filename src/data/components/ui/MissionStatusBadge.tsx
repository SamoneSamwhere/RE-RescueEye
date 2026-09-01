import type { MissionStatus } from '../../types/mission'
import { cn } from '../../lib/cn'

interface MissionStatusBadgeProps {
  status: MissionStatus
  className?: string
}

const LABEL: Record<MissionStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  EN_ROUTE: 'En Route',
  ON_SITE: 'On Site',
  COMPLETED: 'Completed',
}

const BADGE_CLASSES: Record<MissionStatus, string> = {
  PENDING: 'border-mission-pending-border bg-mission-pending-bg text-mission-pending-fg',
  ACCEPTED: 'border-mission-accepted-border bg-mission-accepted-bg text-mission-accepted-fg',
  DECLINED: 'border-mission-declined-border bg-mission-declined-bg text-mission-declined-fg',
  EN_ROUTE: 'border-mission-en-route-border bg-mission-en-route-bg text-mission-en-route-fg',
  ON_SITE: 'border-mission-on-site-border bg-mission-on-site-bg text-mission-on-site-fg',
  COMPLETED: 'border-mission-completed-border bg-mission-completed-bg text-mission-completed-fg',
}

const DOT_CLASSES: Record<MissionStatus, string> = {
  PENDING: 'bg-mission-pending',
  ACCEPTED: 'bg-mission-accepted',
  DECLINED: 'bg-mission-declined',
  EN_ROUTE: 'bg-mission-en-route',
  ON_SITE: 'bg-mission-on-site',
  COMPLETED: 'bg-mission-completed',
}

export function MissionStatusBadge({ status, className }: MissionStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        BADGE_CLASSES[status],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', DOT_CLASSES[status])} />
      {LABEL[status]}
    </span>
  )
}
