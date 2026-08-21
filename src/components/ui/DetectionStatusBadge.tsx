import type { DetectionValidationStatus } from '../../types/detection'
import { cn } from '../../lib/cn'

interface DetectionStatusBadgeProps {
  status: DetectionValidationStatus
  className?: string
}

const LABEL: Record<DetectionValidationStatus, string> = {
  PENDING: 'Pending Review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
}

const BADGE_CLASSES: Record<DetectionValidationStatus, string> = {
  PENDING: 'border-detection-pending-border bg-detection-pending-bg text-detection-pending-fg',
  VERIFIED: 'border-detection-verified-border bg-detection-verified-bg text-detection-verified-fg',
  REJECTED: 'border-detection-rejected-border bg-detection-rejected-bg text-detection-rejected-fg',
}

const DOT_CLASSES: Record<DetectionValidationStatus, string> = {
  PENDING: 'bg-detection-pending',
  VERIFIED: 'bg-detection-verified',
  REJECTED: 'bg-detection-rejected',
}

export function DetectionStatusBadge({ status, className }: DetectionStatusBadgeProps) {
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
