import { useMemo, useState } from 'react'
import { MobileShell } from '../data/components/layout'
import { DamageMapCanvas, MarkerDetailPanel } from '../data/components/map'
import type { MapMarker, IncidentMapMarker } from '../data/components/map'
import { useAuth } from '../features/auth'
import { FIELD_RESPONDER_NAV_ITEMS, useFieldResponderData } from '../features/field-responder'
import { useIncidentStore } from '../state/IncidentStore'
import { useDetectionStore } from '../state/DetectionStore'
import { useNotificationStore } from '../state/NotificationStore'
import { mockUsers } from '../data/mockUsers'
import { notificationsFor } from '../lib/notifications'
import { MAP_VISIBLE_MISSION_STATUSES } from '../lib/missionStatus'

export function FieldResponderMapPage() {
  const { session } = useAuth()
  const { missions } = useFieldResponderData()
  const { incidents } = useIncidentStore()
  const { detections } = useDetectionStore()
  const { notifications: allNotifications } = useNotificationStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const agencyId = session?.agencyId
  const notifications = session ? notificationsFor(allNotifications, session.id) : []

  const markers: MapMarker[] = useMemo(() => {
    const incidentMarkers: MapMarker[] = incidents
      .map((incident): IncidentMapMarker | null => {
        const detection = detections.find((d) => d.id === incident.detectionId)
        if (!detection) return null
        return {
          kind: 'INCIDENT' as const,
          id: `incident-marker-${incident.id}`,
          location: detection.location,
          incidentId: incident.id,
          priority: incident.priority,
          status: incident.status,
          detectionId: detection.id,
          detectionCategory: detection.category,
          damageClassification: detection.damageClassification,
          verifiedAt: incident.verifiedAt,
        }
      })
      .filter((m): m is IncidentMapMarker => m !== null)

    const responderMarkers: MapMarker[] = mockUsers
      .filter((u) => u.role === 'FIELD_RESPONDER' && u.agencyId === agencyId && u.currentLocation)
      .map((responder) => {
        const latestMission = missions.find((m) => m.responderUserId === responder.id)
        const missionStatus =
          latestMission && MAP_VISIBLE_MISSION_STATUSES.has(latestMission.status) ? latestMission.status : undefined
        const missionIncident = missionStatus
          ? incidents.find((i) => i.id === latestMission!.incidentId)
          : undefined

        return {
          kind: 'RESPONDER' as const,
          id: `responder-marker-${responder.id}`,
          location: responder.currentLocation!,
          responderId: responder.id,
          name: responder.name,
          accountStatus: responder.accountStatus,
          missionId: latestMission?.id,
          missionStatus,
          missionIncidentPriority: missionIncident?.priority,
        }
      })

    return [...incidentMarkers, ...responderMarkers]
  }, [detections, incidents, missions, agencyId])

  const selectedMarker = markers.find((m) => m.id === selectedId) ?? null

  if (!session) return null

  return (
    <MobileShell navItems={FIELD_RESPONDER_NAV_ITEMS} notifications={notifications}>
      <div className="flex flex-col gap-4 px-4 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Damage Map</h1>
          <p className="text-sm text-foreground-secondary">Confirmed incidents and responder positions near you.</p>
        </div>
        <DamageMapCanvas markers={markers} selectedId={selectedId} onSelect={(marker) => setSelectedId(marker.id)} />
        <MarkerDetailPanel marker={selectedMarker} showIncidentLink={false} />
      </div>
    </MobileShell>
  )
}
