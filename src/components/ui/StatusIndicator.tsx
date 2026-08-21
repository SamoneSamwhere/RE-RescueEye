import { cn } from '../../lib/cn'

type IndicatorTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

interface StatusIndicatorProps {
  tone?: IndicatorTone
  label: string
  className?: string
}

const DOT_CLASSES: Record<IndicatorTone, string> = {
  neutral: 'bg-neutral',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

/** Inline dot + label, for lightweight status readouts (connection state, online/offline, etc). */
export function StatusIndicator({ tone = 'neutral', label, className }: StatusIndicatorProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm text-foreground-secondary', className)}>
      <span className={cn('size-2 rounded-full', DOT_CLASSES[tone])} />
      {label}
    </span>
  )
}
