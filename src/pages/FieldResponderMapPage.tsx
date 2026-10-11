import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { MobileShell } from '../components/layout'
import { GeoMapCanvas, MapLegend, MarkerDetailPanel } from '../components/map'
import type { MapMarker, IncidentMapMarker } from '../components/map'
import { useAuth } from '../features/auth'
import { FIELD_RESPONDER_NAV_ITEMS, useFieldResponderData } from '../features/field-responder'
import { useIncidentStore } from '../state/IncidentStore'
import { useDetectionStore } from '../state/DetectionStore'
import { useNotificationStore } from '../state/NotificationStore'
import { useMissionStore } from '../state/MissionStore'
import { useLiveUpdates } from '../state/LiveUpdatesStore'
import { mockUsers } from '../data/mockUsers'
import { notificationsFor } from '../lib/notifications'
import { ACTIVE_MISSION_STATUSES } from '../lib/missionStatus'
import { responseTeamFor } from '../lib/responseTeams'
import { fieldResponderMissionDetailPath } from '../routes/paths'

/**
 * The responder's own operational picture: themselves, the incident they have
 * been dispatched to, and the rest of that incident's response team. Nothing
 * else — a responder works one mission at a time and does not triage the
 * agency's other incidents, so showing them only raises "should I go there?".
 * Command Staff keep the full map with filters.
 */
export function FieldResponderMapPage() {
  const { session } = useAuth()
  const { missions } = useFieldResponderData()
  const { missions: allMissions } = useMissionStore()
  const { positions } = useLiveUpdates()
  const { incidents } = useIncidentStore()
  const { detections } = useDetectionStore()
  const { notifications: allNotifications } = useNotificationStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const notifications = session ? notificationsFor(allNotifications, session.id) : []

  // Pending counts too: the responder should see where an incident is before accepting it.
  const myMission = missions.find((m) => ACTIVE_MISSION_STATUSES.has(m.status))

  const markers: MapMarker[] = useMemo(() => {
    if (!session) return []

    const incident = myMission ? incidents.find((i) => i.id === myMission.incidentId) : undefined
    const detection = incident ? detections.find((d) => d.id === incident.detectionId) : undefined
    const incidentMarker: IncidentMapMarker[] =
      incident && detection
        ? [
            {
              kind: 'INCIDENT',
              id: `incident-marker-${incident.id}`,
              location: detection.location,
              incidentId: incident.id,
              priority: incident.priority,
              status: incident.status,
              detectionId: detection.id,
              detectionCategory: detection.category,
              damageClassification: detection.damageClassification,
              verifiedAt: incident.verifiedAt,
            },
          ]
        : []

    // The team is everyone alerted for this incident who did not decline — self
    // included once they accept. Without a mission it is just you.
    const team = myMission ? (responseTeamFor(allMissions, myMission.incidentId)?.members ?? []) : []
    const people = [
      ...team.map((m) => ({ responderId: m.responderUserId, mission: m })),
      ...(team.some((m) => m.responderUserId === session.id) ? [] : [{ responderId: session.id, mission: myMission }]),
    ]

    const responderMarkers: MapMarker[] = people.flatMap(({ responderId, mission }) => {
      const responder = mockUsers.find((u) => u.id === responderId)
      if (!responder) return []
      const live = positions[responder.id]
      const location = live ? { lat: live.lat, lng: live.lng } : responder.currentLocation
      if (!location) return []
      return [
        {
          kind: 'RESPONDER' as const,
          id: `responder-marker-${responder.id}`,
          location,
          responderId: responder.id,
          name: responder.name,
          accountStatus: responder.accountStatus,
          missionId: mission?.id,
          missionStatus: mission?.status,
          missionIncidentPriority: mission ? incident?.priority : undefined,
        },
      ]
    })

    return [...incidentMarker, ...responderMarkers]
  }, [session, myMission, incidents, detections, allMissions, positions])

  const selectedMarker = markers.find((m) => m.id === selectedId) ?? null

  if (!session) return null

  return (
    <MobileShell navItems={FIELD_RESPONDER_NAV_ITEMS} notifications={notifications}>
      <div className="flex flex-col gap-4 px-4 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Damage Map</h1>
          <p className="text-sm text-foreground-secondary">
            {myMission
              ? 'You, your mission location and your response team.'
              : 'No active mission — your mission location will appear here once you are dispatched.'}
          </p>
        </div>
        <GeoMapCanvas
          markers={markers}
          selectedId={selectedId}
          onSelect={(marker) => setSelectedId(marker.id)}
          selfResponderId={session.id}
          // Shorter than the desktop console's full-height map: the mobile shell
          // already spends vertical space on a top bar and a bottom tab bar, and
          // the detail panel below has to stay reachable without a long scroll.
          className="h-[58vh] min-h-[20rem]"
        />
        <MapLegend includeSelf showDetections={false} />
        {myMission ? (
          <Link
            to={fieldResponderMissionDetailPath(myMission.id)}
            className="flex items-center justify-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            Open incident details
            <ChevronRight className="size-4" />
          </Link>
        ) : null}
        {selectedMarker ? <MarkerDetailPanel marker={selectedMarker} showIncidentLink={false} /> : null}
      </div>
    </MobileShell>
  )
}
