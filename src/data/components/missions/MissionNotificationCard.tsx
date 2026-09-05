import { AlertTriangle, MapPin, Check, X } from 'lucide-react'
import { Card, Button, PriorityBadge } from '../ui'
import { formatDateTime } from '../../../lib/formatDateTime'
import { DETECTION_CATEGORY_LABEL, DAMAGE_CLASSIFICATION_LABEL } from '../../../lib/labels'
import type { PendingMissionSummary } from './types'

interface MissionNotificationCardProps {
  mission: PendingMissionSummary
  onAccept: () => void
  onDecline: () => void
}

export function MissionNotificationCard({ mission, onAccept, onDecline }: MissionNotificationCardProps) {
  const detectionTypeLabel = mission.damageClassification
    ? `${DETECTION_CATEGORY_LABEL[mission.detectionCategory]} — ${DAMAGE_CLASSIFICATION_LABEL[mission.damageClassification]}`
    : DETECTION_CATEGORY_LABEL[mission.detectionCategory]

  return (
    <Card className="flex flex-col gap-3 border-accent bg-accent-subtle px-4 py-4">
      <div className="flex items-center gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-foreground-inverse">
          <AlertTriangle className="size-4.5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">New Mission Dispatch</p>
          <p className="text-xs text-foreground-muted">Dispatched {formatDateTime(mission.dispatchedAt)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">Priority</span>
          <PriorityBadge priority={mission.priority} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
            Detection Type
          </span>
          <span className="text-sm text-foreground">{detectionTypeLabel}</span>
        </div>
        <div className="flex items-start justify-between gap-2">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
            Location
          </span>
          <span className="flex items-center gap-1.5 text-right text-sm text-foreground">
            <MapPin className="size-3.5 shrink-0 text-foreground-muted" />
            {mission.location.lat.toFixed(4)}, {mission.location.lng.toFixed(4)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="danger" onClick={onDecline}>
          <X className="size-4" />
          Decline
        </Button>
        <Button variant="primary" onClick={onAccept}>
          <Check className="size-4" />
          Accept
        </Button>
      </div>
    </Card>
  )
}
