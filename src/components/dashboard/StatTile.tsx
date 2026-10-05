import type { ComponentType } from 'react'
import { Card } from '../ui'
import { cn } from '../../lib/cn'

type StatTileTone = 'neutral' | 'warning' | 'danger' | 'info' | 'success'

interface StatTileProps {
  label: string
  value: number
  icon: ComponentType<{ className?: string }>
  tone?: StatTileTone
}

const ICON_TONE_CLASSES: Record<StatTileTone, string> = {
  neutral: 'bg-neutral-bg text-neutral-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
  info: 'bg-info-bg text-info-fg',
  success: 'bg-success-bg text-success-fg',
}

export function StatTile({ label, value, icon: Icon, tone = 'neutral' }: StatTileProps) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-md', ICON_TONE_CLASSES[tone])}>
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-2xl font-semibold leading-tight text-foreground">{value}</p>
        <p className="text-xs text-foreground-secondary">{label}</p>
      </div>
    </Card>
  )
}
