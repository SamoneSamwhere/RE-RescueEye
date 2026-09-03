import { useMemo, useState } from 'react'
import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import { Panel } from '../components/ui'
import { GeoMapCanvas, MarkerDetailPanel } from '../components/map'
import type { MapMarker, IncidentMapMarker } from '../components/map'
import { useAuth } from '../features/auth'
import { useCommandStaffData } from '../features/command-staff'
import { mockUsers } from '../data/mockUsers'
import { MAP_VISIBLE_MISSION_STATUSES } from '../lib/missionStatus'

export function CommandStaffMapPage() {
  const { session } = useAuth()
  const { detections, incidents, missions } = useCommandStaffData()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const agencyId = session?.agencyId

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

    // Only Command Staff-verified casualties are mapped. A PENDING detection is
    // raw AI output that nobody has confirmed, and a REJECTED one was actively
    // dismissed — plotting either would send responders to a location no human
    // has stood behind.
    //
    // Verifying a detection also opens an Incident at the same coordinate (see
    // verifyDetection), so a verified detection that already has an incident
    // marker is skipped rather than stacking a second pin on the same spot.
    // The filter is kept anyway: it is the rule that must hold, not a
    // consequence of how incidents happen to be created today.
    const mappedDetectionIds = new Set(
      incidentMarkers.map((marker) => (marker as IncidentMapMarker).detectionId),
    )
    const detectionMarkers: MapMarker[] = detections
      .filter((detection) => detection.validationStatus === 'VERIFIED')
      .filter((detection) => !mappedDetectionIds.has(detection.id))
      .map((detection) => ({
        kind: 'DETECTION' as const,
        id: `detection-marker-${detection.id}`,
        location: detection.location,
        detectionId: detection.id,
        category: detection.category,
        damageClassification: detection.damageClassification,
        confidence: detection.confidence,
        validationStatus: detection.validationStatus,
        detectedAt: detection.detectedAt,
      }))

    const responderMarkers: MapMarker[] = mockUsers
      .filter((u) => u.role === 'FIELD_RESPONDER' && u.agencyId === agencyId && u.currentLocation)
      .map((responder) => {
        const latestMission = missions
          .filter((m) => m.responderUserId === responder.id)
          .sort((a, b) => b.dispatchedAt.localeCompare(a.dispatchedAt))[0]
        const missionStatus =
          latestMission && MAP_VISIBLE_MISSION_STATUSES.has(latestMission.status) ? latestMission.status : undefined
        const missionIncident = missionStatus
          ? incidents.find((i) => i.id === latestMission.incidentId)
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

    return [...incidentMarkers, ...detectionMarkers, ...responderMarkers]
  }, [detections, incidents, missions, agencyId])

  const selectedMarker = markers.find((m) => m.id === selectedId) ?? null

  return (
    <>
      <PageHeader
        title="Damage Map"
        description="Verified casualties, confirmed incidents, and Field Responder positions across the Cebu City survey area."
      />

      <Reveal className="grid grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel title={`Damage Map (${markers.length} markers)`}>
          <GeoMapCanvas
            markers={markers}
            selectedId={selectedId}
            onSelect={(marker) => setSelectedId(marker.id)}
          />
        </Panel>
        <MarkerDetailPanel marker={selectedMarker} />
      </Reveal>
    </>
  )
}
