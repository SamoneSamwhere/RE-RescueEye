import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronLeft, MapPin, Navigation, CheckCircle2, Flag, LifeBuoy } from 'lucide-react'
import { MobileShell } from '../components/layout'
import { Card, Button, PriorityBadge, MissionStatusBadge, StatusIndicator, EmptyState } from '../components/ui'
import { NavigationPlaceholder } from '../components/missions'
import { useAuth } from '../features/auth'
import { FIELD_RESPONDER_NAV_ITEMS, useFieldResponderData } from '../features/field-responder'
import { mockUsers } from '../data/mockUsers'
import { formatDateTime } from '../lib/formatDateTime'
import { distanceKm } from '../lib/geo'
import { notificationsFor } from '../lib/notifications'
import { DETECTION_CATEGORY_LABEL, DAMAGE_CLASSIFICATION_LABEL } from '../lib/labels'
import { useNotificationStore } from '../state/NotificationStore'
import { useIncidentStore } from '../state/IncidentStore'
import { useDetectionStore } from '../state/DetectionStore'
import { ROUTES } from '../routes/paths'

export function FieldResponderMissionDetailPage() {
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { missions, startNavigation, arriveOnSite, completeMission } = useFieldResponderData()
  const { notifications: allNotifications } = useNotificationStore()
  const { incidents } = useIncidentStore()
  const { detections } = useDetectionStore()

  const currentUser = session ? mockUsers.find((u) => u.id === session.id) : undefined
  const mission = missions.find((m) => m.id === missionId)
  const incident = mission ? incidents.find((i) => i.id === mission.incidentId) : undefined
  const detection = incident ? detections.find((d) => d.id === incident.detectionId) : undefined

  const notifications = session ? notificationsFor(allNotifications, session.id) : []

  if (!session) return null

  const backLink = (
    <Link
      to={ROUTES.fieldResponder}
      className="flex items-center gap-1 text-sm font-medium text-foreground-secondary hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      Home
    </Link>
  )

  if (!mission || !incident || !detection || mission.status === 'PENDING' || mission.status === 'DECLINED') {
    return (
      <MobileShell navItems={FIELD_RESPONDER_NAV_ITEMS} notifications={notifications}>
        <div className="flex flex-col gap-4 px-4 py-4">
          {backLink}
          <Card className="px-4 py-3">
            <EmptyState
              icon={Flag}
              title="Mission not available"
              description="This mission is no longer active. Return to Home to see your current status."
            />
          </Card>
        </div>
      </MobileShell>
    )
  }

  const distance = currentUser?.currentLocation ? distanceKm(currentUser.currentLocation, detection.location) : undefined
  const detectionTypeLabel = detection.damageClassification
    ? `${DETECTION_CATEGORY_LABEL[detection.category]} — ${DAMAGE_CLASSIFICATION_LABEL[detection.damageClassification]}`
    : DETECTION_CATEGORY_LABEL[detection.category]

  return (
    <MobileShell navItems={FIELD_RESPONDER_NAV_ITEMS} notifications={notifications}>
      <div className="flex flex-col gap-4 px-4 py-4">
        {backLink}

        <Card className="flex flex-col gap-3 px-4 py-4">
          <div className="flex items-center justify-between">
            <PriorityBadge priority={incident.priority} />
            <MissionStatusBadge status={mission.status} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
              Detection Type
            </span>
            <span className="text-sm text-foreground">{detectionTypeLabel}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
              Incident Location
            </span>
            <span className="flex items-center gap-1.5 text-sm text-foreground">
              <MapPin className="size-3.5 shrink-0 text-foreground-muted" />
              {detection.location.lat.toFixed(4)}, {detection.location.lng.toFixed(4)}
            </span>
          </div>
          <p className="text-xs text-foreground-muted">Dispatched {formatDateTime(mission.dispatchedAt)}</p>
        </Card>

        <Card className="flex flex-col gap-2 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
              Location Status
            </span>
            <StatusIndicator tone="success" label="Sharing" />
          </div>
          <p className="flex items-center gap-1.5 text-sm text-foreground-secondary">
            <MapPin className="size-3.5 shrink-0" />
            {currentUser?.currentLocation
              ? `${currentUser.currentLocation.lat.toFixed(4)}, ${currentUser.currentLocation.lng.toFixed(4)}`
              : 'Location unavailable'}
          </p>
        </Card>

        <NavigationPlaceholder
          distanceKm={distance ?? 0}
          isEnRoute={mission.status === 'EN_ROUTE' || mission.status === 'ON_SITE'}
        />

        {mission.status === 'ACCEPTED' ? (
          <Button variant="primary" size="lg" className="w-full" onClick={() => startNavigation(mission.id)}>
            <Navigation className="size-4" />
            Start Navigation
          </Button>
        ) : null}

        {mission.status === 'EN_ROUTE' ? (
          <Button variant="primary" size="lg" className="w-full" onClick={() => arriveOnSite(mission.id)}>
            <Flag className="size-4" />
            Arrived On-Site
          </Button>
        ) : null}

        {mission.status === 'ON_SITE' ? (
          <>
            <Card className="flex items-center gap-2 border-success-border bg-success-bg px-4 py-3">
              <LifeBuoy className="size-5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-semibold text-foreground">Rescue In Progress</p>
                <p className="text-xs text-foreground-muted">
                  Arrived {mission.onSiteAt ? formatDateTime(mission.onSiteAt) : ''} — report complete when the rescue is finished.
                </p>
              </div>
            </Card>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => {
                completeMission(mission.id)
                navigate(ROUTES.fieldResponder)
              }}
            >
              <CheckCircle2 className="size-4" />
              Report Rescue Complete
            </Button>
          </>
        ) : null}
      </div>
    </MobileShell>
  )
}
