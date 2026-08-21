import { useMemo } from 'react'
import { ScanSearch, ShieldCheck, Navigation, UserCheck } from 'lucide-react'
import { AppShell, PageHeader } from '../components/layout'
import {
  StatTile,
  IncidentPrioritySummary,
  PendingDetectionsPanel,
  RecentDetectionsPanel,
  ConfirmedIncidentsPanel,
  ActiveMissionsPanel,
  ResponderStatusPanel,
  RecentNotificationsPanel,
} from '../components/dashboard'
import type {
  DetectionListItem,
  IncidentListItem,
  MissionListItem,
  ResponderStatusItem,
} from '../components/dashboard'
import { OperationalMapPreview } from '../components/map'
import { useAuth } from '../features/auth'
import { COMMAND_STAFF_NAV_ITEMS, useCommandStaffData } from '../features/command-staff'
import { mockDrones } from '../data/mockDrones'
import { mockUsers } from '../data/mockUsers'
import { sourceLabelFor } from '../lib/sourceLabel'
import { ACTIVE_MISSION_STATUSES } from '../lib/missionStatus'
import type { IncidentPriority } from '../types/incident'

const RECENT_DETECTIONS_LIMIT = 6
const RECENT_NOTIFICATIONS_LIMIT = 5

export function CommandStaffDashboardPage() {
  const { session, logout } = useAuth()
  const {
    detections: sharedDetections,
    incidents: sharedIncidents,
    missions: sharedMissions,
    mediaAssets,
    notifications: sharedNotifications,
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
    const recentDetections = detections.slice(0, RECENT_DETECTIONS_LIMIT)

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

    const priorityCounts: Record<IncidentPriority, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
    for (const incident of openIncidents) {
      priorityCounts[incident.priority] += 1
    }

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

    const notifications = [...sharedNotifications]
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
      .slice(0, RECENT_NOTIFICATIONS_LIMIT)

    const mapPins = openIncidents.map((incident) => ({ id: incident.id, priority: incident.priority }))

    return {
      pendingDetections,
      recentDetections,
      confirmedIncidents: openIncidents,
      priorityCounts,
      activeMissions,
      responderStatus,
      notifications,
      mapPins,
      availableResponders: responderStatus.filter((r) => r.isActive && !r.missionStatus).length,
    }
  }, [agencyId, sharedDetections, sharedIncidents, sharedMissions, sharedNotifications, mediaAssets])

  if (!session) return null

  return (
    <AppShell
      user={{ name: session.name, role: session.role, agencyName: session.agencyName }}
      navItems={COMMAND_STAFF_NAV_ITEMS}
      notifications={data.notifications.map((n) => ({
        id: n.id,
        title: n.message,
        timestamp: n.sentAt,
        read: n.read,
        type: n.type,
      }))}
      onLogout={logout}
    >
      <PageHeader
        title="Command Staff Dashboard"
        description={`Operational overview for ${session.agencyName ?? 'your agency'}`}
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Pending Detections" value={data.pendingDetections.length} icon={ScanSearch} tone="warning" />
          <StatTile label="Confirmed Incidents" value={data.confirmedIncidents.length} icon={ShieldCheck} tone="danger" />
          <StatTile label="Active Missions" value={data.activeMissions.length} icon={Navigation} tone="info" />
          <StatTile label="Available Responders" value={data.availableResponders} icon={UserCheck} tone="success" />
        </div>

        <IncidentPrioritySummary counts={data.priorityCounts} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <PendingDetectionsPanel detections={data.pendingDetections} />
          <ConfirmedIncidentsPanel incidents={data.confirmedIncidents} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ActiveMissionsPanel missions={data.activeMissions} />
          <ResponderStatusPanel responders={data.responderStatus} />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <OperationalMapPreview pins={data.mapPins} />
          <RecentNotificationsPanel notifications={data.notifications} />
        </div>

        <RecentDetectionsPanel detections={data.recentDetections} />
      </div>
    </AppShell>
  )
}
