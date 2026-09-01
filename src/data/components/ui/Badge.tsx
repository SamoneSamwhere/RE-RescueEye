import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'border-neutral-border bg-neutral-bg text-neutral-fg',
  success: 'border-success-border bg-success-bg text-success-fg',
  warning: 'border-warning-border bg-warning-bg text-warning-fg',
  danger: 'border-danger-border bg-danger-bg text-danger-fg',
  info: 'border-info-border bg-info-bg text-info-fg',
}

/** Generic labeled tag. For domain enums, prefer PriorityBadge / DetectionStatusBadge / MissionStatusBadge. */
export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  )
}
