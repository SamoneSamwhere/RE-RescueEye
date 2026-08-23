import { useMemo } from 'react'
import { ScanSearch, Navigation, UserCheck } from 'lucide-react'
import { PageHeader } from '../components/layout'
import { Reveal } from '../components/landing/Reveal'
import {
  StatTile,
  PendingDetectionsPanel,
  ActiveMissionsPanel,
  ResponderStatusPanel,
} from '../components/dashboard'
import type {
  DetectionListItem,
  IncidentListItem,
  MissionListItem,
  ResponderStatusItem,
} from '../components/dashboard'
import { DamageMapPreview } from '../components/map'
import { useAuth } from '../features/auth'
import { useCommandStaffData } from '../features/command-staff'
import { mockDrones } from '../data/mockDrones'
import { mockUsers } from '../data/mockUsers'
import { sourceLabelFor } from '../lib/sourceLabel'
import { ACTIVE_MISSION_STATUSES } from '../lib/missionStatus'

export function CommandStaffDashboardPage() {
  const { session } = useAuth()
  const {
    detections: sharedDetections,
    incidents: sharedIncidents,
    missions: sharedMissions,
    mediaAssets,
  } = useCommandStaffData()

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

    const incidents: IncidentListItem[] = sharedIncidents
      .map((incident) => {
        const detection = sharedDetections.find((d) => d.id === incident.detectionId)
        return {
          id: incident.id,
          priority: incident.priority,
          status: incident.status,
          detectionCategory: detection?.category ?? 'DAMAGE',
          verifiedAt: incident.verifiedAt,
        }
      })
      .sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt))

    const openIncidents = incidents.filter((incident) => incident.status !== 'CLOSED')

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

    const mapPins = openIncidents.map((incident) => ({ id: incident.id, priority: incident.priority }))

    return {
      pendingDetections,
      activeMissions,
      responderStatus,
      mapPins,
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

      <div className="flex flex-col gap-6 px-4 py-4">
        <Reveal>
          <div className="grid grid-cols-1 gap-4">
            <DamageMapPreview pins={data.mapPins} />
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Pending Detections" value={data.pendingDetections.length} icon={ScanSearch} tone="warning" />
            <StatTile label="Active Missions" value={data.activeMissions.length} icon={Navigation} tone="info" />
            <StatTile label="Available Responders" value={data.availableResponders} icon={UserCheck} tone="success" />
          </div>
        </Reveal>

        <Reveal delayMs={200}>
          <div className="grid grid-cols-1 gap-4">
            <PendingDetectionsPanel detections={data.pendingDetections} />
          </div>
        </Reveal>

        <Reveal delayMs={300}>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ActiveMissionsPanel missions={data.activeMissions} />
            <ResponderStatusPanel responders={data.responderStatus} />
          </div>
        </Reveal>
      </div>
    </>
  )
}
