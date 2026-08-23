import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { mockUsers } from '../../data/mockUsers'
import { now } from '../../lib/now'
import { generateId } from '../../lib/id'
import { runMockDetection } from '../../lib/mockAiService'
import { ACTIVE_MISSION_STATUSES } from '../../lib/missionStatus'
import type { Detection } from '../../types/detection'
import type { Incident, IncidentPriority } from '../../types/incident'
import type { Mission } from '../../types/mission'
import type { MediaAsset, MediaSourceType } from '../../types/media'
import type { GeoPoint } from '../../types/geo'
import type { Notification } from '../../types/notification'
import type { Drone } from '../../types/drone'
import { useAuth } from '../auth'
import { useMissionStore } from '../../state/MissionStore'
import { useIncidentStore } from '../../state/IncidentStore'
import { useDetectionStore } from '../../state/DetectionStore'
import { useMediaAssetStore } from '../../state/MediaAssetStore'
import { useNotificationStore } from '../../state/NotificationStore'
import { useDroneStore } from '../../state/DroneStore'

/** Fallback operating area — only used the first time an agency captures media, before it has any detections of its own to center on. */
const DEFAULT_AREA_CENTER: GeoPoint = { lat: 37.775, lng: -122.42 }

interface CommandStaffDataContextValue {
  detections: Detection[]
  incidents: Incident[]
  missions: Mission[]
  mediaAssets: MediaAsset[]
  notifications: Notification[]
  drones: Drone[]
  liveDroneIds: string[]
  verifyDetection: (detectionId: string, priority: IncidentPriority, notes: string) => void
  rejectDetection: (detectionId: string, notes: string) => void
  updateIncidentPriority: (incidentId: string, priority: IncidentPriority) => void
  dispatchIncident: (incidentId: string, responderUserId: string) => Mission | null
  closeIncident: (incidentId: string) => void
  captureMedia: (sourceType: MediaSourceType, droneId: string | undefined, fileName?: string) => Detection
  registerDrone: (input: { name: string; serialNumber: string }) => void
  connectDrone: (droneId: string) => void
  startLiveFeed: (droneId: string) => void
  stopLiveFeed: (droneId: string) => void
}

const CommandStaffDataContext = createContext<CommandStaffDataContextValue | undefined>(undefined)

/**
 * Shared mock state scoped to the signed-in Command Staff member's agency.
 * Lives above every Command Staff route so an action taken in one screen
 * (capturing media, verifying a detection, dispatching an incident) is
 * immediately reflected everywhere else. Media assets, detections,
 * incidents, and missions all come from their own app-wide stores (see
 * state/) rather than local state here — this provider itself remounts
 * whenever Command Staff routes are left and re-entered (e.g. a role
 * switch), and anything kept as local state would reset on that remount,
 * silently orphaning records created since the last mount.
 */
export function CommandStaffDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const agencyId = session?.agencyId
  const { missions: allMissions, addMission } = useMissionStore()
  const { incidents: allIncidents, addIncident, updateIncident } = useIncidentStore()
  const { detections: allDetections, addDetection, updateDetection } = useDetectionStore()
  const { mediaAssets: allMediaAssets, addMediaAsset } = useMediaAssetStore()
  const { notifications: allNotifications, addNotification } = useNotificationStore()
  const {
    drones: allDrones,
    liveDroneIds: allLiveDroneIds,
    addDrone,
    updateDrone,
    startLiveFeed,
    stopLiveFeed,
  } = useDroneStore()

  const mediaAssets = useMemo(
    () => allMediaAssets.filter((m) => m.agencyId === agencyId),
    [allMediaAssets, agencyId],
  )
  const detections = useMemo(
    () =>
      allDetections.filter((detection) => {
        const media = mediaAssets.find((asset) => asset.id === detection.mediaAssetId)
        return media?.agencyId === agencyId
      }),
    [allDetections, mediaAssets, agencyId],
  )
  const incidents = useMemo(() => allIncidents.filter((i) => i.agencyId === agencyId), [allIncidents, agencyId])
  const missions = useMemo(
    () =>
      allMissions.filter((mission) => {
        const responder = mockUsers.find((u) => u.id === mission.responderUserId)
        return responder?.agencyId === agencyId
      }),
    [allMissions, agencyId],
  )
  const notifications = useMemo(
    () =>
      allNotifications.filter((notification) => {
        const recipient = mockUsers.find((u) => u.id === notification.recipientUserId)
        return recipient?.agencyId === agencyId
      }),
    [allNotifications, agencyId],
  )
  const drones = useMemo(() => allDrones.filter((d) => d.agencyId === agencyId), [allDrones, agencyId])
  const liveDroneIds = useMemo(
    () => allLiveDroneIds.filter((droneId) => drones.some((d) => d.id === droneId)),
    [allLiveDroneIds, drones],
  )

  /**
   * Media -> AI Detection. A drone feed frame or an uploaded video is handed
   * to the mock AI service, which always produces exactly one PENDING
   * Detection — the connective step between the Drones & Media workflow and
   * Detection Review. No real inference; see lib/mockAiService.
   */
  function captureMedia(sourceType: MediaSourceType, droneId: string | undefined, fileName?: string): Detection {
    if (!agencyId) throw new Error('No active agency')
    const nowIso = now().toISOString()

    const newAsset: MediaAsset = {
      id: generateId('media'),
      agencyId,
      sourceType,
      droneId,
      url:
        sourceType === 'LIVE_FEED'
          ? `mock://live-feed/${droneId}/session-${newAssetSuffix()}`
          : `mock://uploads/${fileName ?? 'upload'}-${newAssetSuffix()}`,
      capturedAt: nowIso,
      uploadedByUserId: sourceType === 'UPLOADED_VIDEO' ? session?.id : undefined,
    }
    addMediaAsset(newAsset)

    // Center newly generated detections on this agency's own existing detections when it has any, rather than a single global point.
    const areaCenter = detections.length > 0 ? averageLocation(detections.map((d) => d.location)) : DEFAULT_AREA_CENTER

    const newDetection: Detection = {
      id: generateId('det'),
      ...runMockDetection(newAsset.id, areaCenter),
    }
    addDetection(newDetection)

    return newDetection
  }

  /**
   * Verifying a detection creates an Incident and notifies this Command
   * Staff member's peers in the agency — both that the detection was
   * verified and that a new incident now exists. No-ops if the detection
   * has already been reviewed.
   */
  function verifyDetection(detectionId: string, priority: IncidentPriority, notes: string) {
    if (!session || !agencyId) return
    const detection = detections.find((d) => d.id === detectionId)
    if (!detection || detection.validationStatus !== 'PENDING') return
    const nowIso = now().toISOString()

    updateDetection(detectionId, {
      validationStatus: 'VERIFIED',
      reviewedByUserId: session.id,
      reviewedAt: nowIso,
      reviewerNotes: notes.trim() || undefined,
    })

    const newIncidentId = generateId('incident')
    const newIncident: Incident = {
      id: newIncidentId,
      detectionId,
      agencyId,
      priority,
      status: 'OPEN',
      verifiedByUserId: session.id,
      verifiedAt: nowIso,
    }
    addIncident(newIncident)

    const peers = mockUsers.filter(
      (user) => user.role === 'COMMAND_STAFF' && user.agencyId === agencyId && user.id !== session.id,
    )
    for (const peer of peers) {
      addNotification({
        id: generateId('notif'),
        recipientUserId: peer.id,
        type: 'DETECTION_VERIFIED',
        channel: 'IN_APP',
        message: `Detection ${detectionId} was verified by ${session.name}.`,
        sentAt: nowIso,
        read: false,
      })
      addNotification({
        id: generateId('notif'),
        recipientUserId: peer.id,
        type: 'INCIDENT_CREATED',
        channel: 'IN_APP',
        message: `Incident ${newIncidentId} created from a verified detection.`,
        sentAt: nowIso,
        read: false,
      })
    }
  }

  /** No-ops if the detection has already been reviewed. */
  function rejectDetection(detectionId: string, notes: string) {
    if (!session) return
    const detection = detections.find((d) => d.id === detectionId)
    if (!detection || detection.validationStatus !== 'PENDING') return
    updateDetection(detectionId, {
      validationStatus: 'REJECTED',
      reviewedByUserId: session.id,
      reviewedAt: now().toISOString(),
      reviewerNotes: notes.trim() || undefined,
    })
  }

  function updateIncidentPriority(incidentId: string, priority: IncidentPriority) {
    updateIncident(incidentId, { priority })
  }

  /**
   * Confirmed Incident -> Notify nearest Field Responder -> mock SMS.
   * Creates a PENDING Mission and a MISSION_DISPATCH (or MISSION_REASSIGNED,
   * if a prior mission on this incident was declined) Notification, and
   * escalates the incident from OPEN to DISPATCHED. No real SMS, no backend.
   * Returns null (no-op) if the incident already has an active mission —
   * an incident should never have two responders working it at once.
   */
  function dispatchIncident(incidentId: string, responderUserId: string): Mission | null {
    const alreadyActive = allMissions.some(
      (mission) => mission.incidentId === incidentId && ACTIVE_MISSION_STATUSES.has(mission.status),
    )
    if (alreadyActive) return null

    const nowIso = now().toISOString()

    const newMission: Mission = {
      id: generateId('mission'),
      incidentId,
      responderUserId,
      dispatchedByUserId: session?.id ?? '',
      status: 'PENDING',
      dispatchedAt: nowIso,
    }
    addMission(newMission)

    const isReassignment = allMissions.some(
      (mission) => mission.incidentId === incidentId && mission.status === 'DECLINED',
    )

    addNotification({
      id: generateId('notif'),
      recipientUserId: responderUserId,
      type: isReassignment ? 'MISSION_REASSIGNED' : 'MISSION_DISPATCH',
      channel: 'SMS',
      message: isReassignment
        ? 'Mission reassigned to you after another responder declined. Reply to accept or decline.'
        : 'New mission dispatched. Reply to accept or decline.',
      missionId: newMission.id,
      sentAt: nowIso,
      read: false,
    })

    const incident = allIncidents.find((i) => i.id === incidentId)
    if (incident?.status === 'OPEN') {
      updateIncident(incidentId, { status: 'DISPATCHED' })
    }

    return newMission
  }

  /** Mission completed -> Command Staff confirms the incident is resolved -> Close incident. Never deletes the record. */
  function closeIncident(incidentId: string) {
    if (!session) return
    updateIncident(incidentId, { status: 'CLOSED', closedByUserId: session.id, closedAt: now().toISOString() })
  }

  function registerDrone(input: { name: string; serialNumber: string }) {
    if (!agencyId) return
    addDrone({
      id: generateId('drone'),
      agencyId,
      name: input.name,
      serialNumber: input.serialNumber,
      connectionStatus: 'DISCONNECTED',
      registeredAt: now().toISOString(),
    })
  }

  function connectDrone(droneId: string) {
    updateDrone(droneId, { connectionStatus: 'CONNECTED', lastConnectedAt: now().toISOString() })
  }

  return (
    <CommandStaffDataContext.Provider
      value={{
        detections,
        incidents,
        missions,
        mediaAssets,
        notifications,
        drones,
        liveDroneIds,
        verifyDetection,
        rejectDetection,
        updateIncidentPriority,
        dispatchIncident,
        closeIncident,
        captureMedia,
        registerDrone,
        connectDrone,
        startLiveFeed,
        stopLiveFeed,
      }}
    >
      {children}
    </CommandStaffDataContext.Provider>
  )
}

function newAssetSuffix(): string {
  return crypto.randomUUID().slice(0, 8)
}

function averageLocation(points: GeoPoint[]): GeoPoint {
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

export function useCommandStaffData() {
  const ctx = useContext(CommandStaffDataContext)
  if (!ctx) {
    throw new Error('useCommandStaffData must be used within a CommandStaffDataProvider')
  }
  return ctx
}
