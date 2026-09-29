import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanSearch, Navigation, UserCheck, Maximize2 } from 'lucide-react'
import { PageHeader } from '../data/components/layout'
import { Reveal } from '../data/components/landing/Reveal'
import {
  StatTile,
  PendingDetectionsPanel,
  ActiveMissionsPanel,
  ResponderStatusPanel,
} from '../data/components/dashboard'
import type {
  DetectionListItem,
  MissionListItem,
  ResponderStatusItem,
} from '../data/components/dashboard'
import { GeoMapCanvas, MapLegend } from '../data/components/map'
import { Button, Panel } from '../data/components/ui'
import { useAuth } from '../features/auth'
import { useCommandStaffData, useDamageMapMarkers } from '../features/command-staff'
import { mockDrones } from '../data/mockDrones'
import { mockUsers } from '../data/mockUsers'
import { sourceLabelFor } from '../lib/sourceLabel'
import { ACTIVE_MISSION_STATUSES } from '../lib/missionStatus'
import { ROUTES } from '../routes/paths'

export function CommandStaffDashboardPage() {
  const { session } = useAuth()
  const {
    detections: sharedDetections,
    incidents: sharedIncidents,
    missions: sharedMissions,
    mediaAssets,
  } = useCommandStaffData()
  const mapMarkers = useDamageMapMarkers()
  const navigate = useNavigate()

  const agencyId = session?.agencyId

  const data = useMemo(() => {
    const detections: DetectionListItem[] = sharedDetections
      .map((detection) => ({
        id: detection.id,
        category: detection.category,
        confidence: detection.confidence,
        detectedAt: detection.detectedAt,
        validationStatus: detection.validationStatus,
        sourceLabel: sourceLabelFor(detection.mediaAssetId, mediaAssets, mockDrones),
      }))
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))

    const pendingDetections = detections.filter((d) => d.validationStatus === 'PENDING')


    const agencyResponders = mockUsers.filter((u) => u.role === 'FIELD_RESPONDER' && u.agencyId === agencyId)

    const missions: MissionListItem[] = sharedMissions
      .map((mission) => {
        const responder = mockUsers.find((u) => u.id === mission.responderUserId)
        const incident = sharedIncidents.find((i) => i.id === mission.incidentId)
        return {
          id: mission.id,
          responderName: responder?.name ?? 'Unknown responder',
          incidentPriority: incident?.priority ?? 'LOW',
          status: mission.status,
          dispatchedAt: mission.dispatchedAt,
        }
      })

    const activeMissions = missions
      .filter((mission) => ACTIVE_MISSION_STATUSES.has(mission.status))
      .sort((a, b) => b.dispatchedAt.localeCompare(a.dispatchedAt))

    const responderStatus: ResponderStatusItem[] = agencyResponders.map((responder) => {
      const activeMission = sharedMissions.find(
        (mission) => mission.responderUserId === responder.id && ACTIVE_MISSION_STATUSES.has(mission.status),
      )
      const incident = activeMission ? sharedIncidents.find((i) => i.id === activeMission.incidentId) : undefined
      return {
        id: responder.id,
        name: responder.name,
        isActive: responder.accountStatus === 'ACTIVE',
        missionStatus: activeMission?.status,
        incidentPriority: incident?.priority,
      }
    })

    return {
      pendingDetections,
      activeMissions,
      responderStatus,
      availableResponders: responderStatus.filter((r) => r.isActive && !r.missionStatus).length,
    }
  }, [agencyId, sharedDetections, sharedIncidents, sharedMissions, mediaAssets])

  if (!session) return null

  return (
    <>
      <PageHeader
        title="Command Staff Dashboard"
        description={`Operational overview for ${session.agencyName ?? 'your agency'}`}
      />

      <div className="px-4 py-4">
        {/* Two halves on a wide screen: the numbers, the queue, missions and
            responders on the left; the map on the right, held in view while
            the left side scrolls. On a narrow screen the map stays first. */}
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <Reveal className="lg:order-2 lg:sticky lg:top-4">
            {/* The same map, markers and clustering as the full Damage Map —
                one marker source, so the two can never disagree. Clicking a
                marker opens the full map with it selected. */}
            <Panel
              title={`Damage Map (${mapMarkers.length} markers)`}
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.commandStaffMap)}>
                  <Maximize2 className="size-3.5" />
                  Open Damage Map
                </Button>
              }
            >
              <div className="flex flex-col gap-3">
                <GeoMapCanvas
                  cluster
                  markers={mapMarkers}
                  selectedId={null}
                  onSelect={(marker) =>
                    navigate(`${ROUTES.commandStaffMap}?marker=${encodeURIComponent(marker.id)}`)
                  }
                  className="h-72 lg:h-[calc(100vh-15rem)] lg:min-h-[24rem]"
                />
                <MapLegend />
              </div>
            </Panel>
          </Reveal>

          <div className="flex flex-col gap-4 lg:order-1">
            <Reveal delayMs={100}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatTile label="Pending Detections" value={data.pendingDetections.length} icon={ScanSearch} tone="warning" />
                <StatTile label="Active Missions" value={data.activeMissions.length} icon={Navigation} tone="info" />
                <StatTile label="Available Responders" value={data.availableResponders} icon={UserCheck} tone="success" />
              </div>
            </Reveal>

            <Reveal delayMs={200}>
              <PendingDetectionsPanel detections={data.pendingDetections} />
            </Reveal>

            <Reveal delayMs={300}>
              <ActiveMissionsPanel missions={data.activeMissions} />
            </Reveal>

            <Reveal delayMs={350}>
              <ResponderStatusPanel responders={data.responderStatus} />
            </Reveal>
          </div>
        </div>
      </div>
    </>
  )
}
