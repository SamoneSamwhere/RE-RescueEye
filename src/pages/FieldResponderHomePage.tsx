import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Radar, MapPin, Navigation, ChevronRight } from 'lucide-react'
import { MobileShell } from '../data/components/layout'
import { Card, StatusIndicator, PriorityBadge, MissionStatusBadge, EmptyState } from '../data/components/ui'
import { Reveal } from '../data/components/landing/Reveal'
import { MissionNotificationCard } from '../data/components/missions'
import { useAuth } from '../features/auth'
import { FIELD_RESPONDER_NAV_ITEMS, useFieldResponderData } from '../features/field-responder'
import { mockUsers } from '../data/mockUsers'
import { formatDateTime } from '../lib/formatDateTime'
import { now } from '../lib/now'
import { notificationsFor } from '../lib/notifications'
import { useNotificationStore } from '../state/NotificationStore'
import { useIncidentStore } from '../state/IncidentStore'
import { useDetectionStore } from '../state/DetectionStore'
import { FIELD_RESPONDER_ACTIVE_STATUSES } from '../lib/missionStatus'
import { fieldResponderMissionDetailPath } from '../routes/paths'

export function FieldResponderHomePage() {
  const { session } = useAuth()
  const { missions, acceptMission, declineMission } = useFieldResponderData()
  const { notifications: allNotifications } = useNotificationStore()
  const { incidents } = useIncidentStore()
  const { detections } = useDetectionStore()
  const [locationSharedAt] = useState(() => now().toISOString())

  const currentUser = session ? mockUsers.find((u) => u.id === session.id) : undefined

  const pendingMission = missions.find((m) => m.status === 'PENDING')
  const pendingIncident = pendingMission ? incidents.find((i) => i.id === pendingMission.incidentId) : undefined
  const pendingDetection = pendingIncident
    ? detections.find((d) => d.id === pendingIncident.detectionId)
    : undefined

  const activeMission = missions.find((m) => FIELD_RESPONDER_ACTIVE_STATUSES.has(m.status))
  const activeIncident = activeMission ? incidents.find((i) => i.id === activeMission.incidentId) : undefined

  const notifications = session ? notificationsFor(allNotifications, session.id) : []

  if (!session) return null

  return (
    <MobileShell navItems={FIELD_RESPONDER_NAV_ITEMS} notifications={notifications}>
      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          {pendingMission && pendingIncident && pendingDetection ? (
            <MissionNotificationCard
              mission={{
                missionId: pendingMission.id,
                incidentId: pendingIncident.id,
                priority: pendingIncident.priority,
                detectionCategory: pendingDetection.category,
                damageClassification: pendingDetection.damageClassification,
                location: pendingDetection.location,
                dispatchedAt: pendingMission.dispatchedAt,
              }}
              onAccept={() => acceptMission(pendingMission.id)}
              onDecline={() => declineMission(pendingMission.id)}
            />
          ) : !activeMission ? (
            <Card className="flex flex-col items-center gap-3 px-6 py-8 text-center">
              <span className="relative flex size-16 items-center justify-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent-subtle" />
                <span className="relative flex size-16 items-center justify-center rounded-full bg-accent-subtle text-accent">
                  <Radar className="size-7" />
                </span>
              </span>
              <div>
                <p className="text-base font-semibold text-foreground">On Duty — Waiting for Dispatch</p>
                <p className="mt-1 text-sm text-foreground-secondary">
                  You'll be notified here and by SMS when a mission is assigned.
                </p>
              </div>
            </Card>
          ) : null}
        </Reveal>

        <Reveal delayMs={100}>
          <Card className="flex flex-col gap-2 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
                Location Sharing
              </span>
              <StatusIndicator tone="success" label="Sharing" />
            </div>
            <p className="flex items-center gap-1.5 text-sm text-foreground-secondary">
              <MapPin className="size-3.5 shrink-0" />
              {currentUser?.currentLocation
                ? `${currentUser.currentLocation.lat.toFixed(4)}, ${currentUser.currentLocation.lng.toFixed(4)}`
                : 'Location unavailable'}
            </p>
            <p className="text-xs text-foreground-muted">Last updated {formatDateTime(locationSharedAt)}</p>
          </Card>
        </Reveal>

        <Reveal delayMs={200}>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
              Current Mission
            </p>
            {activeMission && activeIncident ? (
              <Link to={fieldResponderMissionDetailPath(activeMission.id)}>
                <Card className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-surface-secondary">
                  <div className="flex items-center justify-between">
                    <PriorityBadge priority={activeIncident.priority} />
                    <MissionStatusBadge status={activeMission.status} />
                  </div>
                  <p className="flex items-center gap-1.5 text-sm text-foreground-secondary">
                    <Navigation className="size-3.5 shrink-0" />
                    Dispatched {formatDateTime(activeMission.dispatchedAt)}
                  </p>
                  <p className="flex items-center gap-1 text-xs font-medium text-accent">
                    View mission details
                    <ChevronRight className="size-3.5" />
                  </p>
                </Card>
              </Link>
            ) : (
              <Card className="px-4 py-3">
                <EmptyState
                  icon={Radar}
                  title="No active mission"
                  description="Stand by — you'll be notified the moment one is dispatched to you."
                />
              </Card>
            )}
          </div>
        </Reveal>
      </div>
    </MobileShell>
  )
}
