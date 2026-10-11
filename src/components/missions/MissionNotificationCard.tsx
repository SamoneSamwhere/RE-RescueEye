import { BellRing, MapPin, Check, X, Clock, Route } from 'lucide-react'
import { Card, Button, PriorityBadge } from '../ui'
import { formatDateTime } from '../../lib/formatDateTime'
import { DETECTION_CATEGORY_LABEL, DAMAGE_CLASSIFICATION_LABEL } from '../../lib/labels'
import type { PendingMissionSummary } from './types'

interface MissionNotificationCardProps {
  mission: PendingMissionSummary
  /** Straight-line distance from the responder, already formatted — omitted until there is a GPS fix. */
  distance?: string
  onAccept: () => void
  onDecline: () => void
}

export function MissionNotificationCard({ mission, distance, onAccept, onDecline }: MissionNotificationCardProps) {
  const detectionTypeLabel = mission.damageClassification
    ? `${DETECTION_CATEGORY_LABEL[mission.detectionCategory]} — ${DAMAGE_CLASSIFICATION_LABEL[mission.damageClassification]}`
    : DETECTION_CATEGORY_LABEL[mission.detectionCategory]

  return (
    <Card className="overflow-hidden border-accent/40 shadow-modal">
      {/* Priority-coloured header so urgency reads before any text does. */}
      <div
        className="flex items-center gap-3 px-4 py-3 text-foreground-inverse"
        style={{ background: `var(--color-priority-${mission.priority.toLowerCase()})` }}
      >
        <span className="relative flex size-10 shrink-0 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-white/30 motion-safe:animate-ping" />
          <span className="relative flex size-10 items-center justify-center rounded-full bg-white/20">
            <BellRing className="size-5" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide opacity-90">New mission dispatch</p>
          <p className="truncate text-lg font-semibold leading-tight">{detectionTypeLabel}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={mission.priority} />
          {distance ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-foreground">
              <Route className="size-3.5 text-accent" />
              {distance} away
            </span>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-md bg-surface-secondary px-3 py-2">
            <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              <MapPin className="size-3" />
              Location
            </dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
              {mission.location.lat.toFixed(4)}, {mission.location.lng.toFixed(4)}
            </dd>
          </div>
          <div className="rounded-md bg-surface-secondary px-3 py-2">
            <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
              <Clock className="size-3" />
              Dispatched
            </dt>
            <dd className="mt-0.5 text-sm font-medium text-foreground">{formatDateTime(mission.dispatchedAt)}</dd>
          </div>
        </dl>

        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <Button variant="outline" size="lg" className="h-12" onClick={onDecline}>
            <X className="size-4" />
            Decline
          </Button>
          <Button variant="primary" size="lg" className="h-12 text-base font-semibold" onClick={onAccept}>
            <Check className="size-5" />
            Accept Mission
          </Button>
        </div>
      </div>
    </Card>
  )
}
