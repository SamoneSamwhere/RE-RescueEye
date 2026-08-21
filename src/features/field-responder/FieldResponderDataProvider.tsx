import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { now } from '../../lib/now'
import { generateId } from '../../lib/id'
import type { Mission, MissionStatus } from '../../types/mission'
import type { NotificationType } from '../../types/notification'
import { useAuth } from '../auth'
import { useMissionStore } from '../../state/MissionStore'
import { useIncidentStore } from '../../state/IncidentStore'
import { useNotificationStore } from '../../state/NotificationStore'

interface FieldResponderDataContextValue {
  missions: Mission[]
  acceptMission: (missionId: string) => void
  declineMission: (missionId: string) => void
  startNavigation: (missionId: string) => void
  arriveOnSite: (missionId: string) => void
  completeMission: (missionId: string) => void
}

const FieldResponderDataContext = createContext<FieldResponderDataContextValue | undefined>(undefined)

/**
 * Scopes the shared mission store (see state/MissionStore.tsx) down to this
 * responder's own missions, and exposes the status-transition actions used
 * by the waiting screen and mission detail screen. Each transition also
 * notifies the Command Staff member who dispatched the mission, via the
 * shared NotificationStore, so status changes are visible on their side
 * without a backend.
 */
export function FieldResponderDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { missions: allMissions, updateMission } = useMissionStore()
  const { updateIncident } = useIncidentStore()
  const { addNotification } = useNotificationStore()

  const missions = useMemo(
    () => allMissions.filter((mission) => mission.responderUserId === session?.id),
    [allMissions, session?.id],
  )

  function notifyDispatcher(missionId: string, type: NotificationType, message: string) {
    const mission = allMissions.find((m) => m.id === missionId)
    if (!mission) return
    addNotification({
      id: generateId('notif'),
      recipientUserId: mission.dispatchedByUserId,
      type,
      channel: 'IN_APP',
      message,
      missionId,
      sentAt: now().toISOString(),
      read: false,
    })
  }

  /** Only applies the transition if the mission is currently in `from` — guards against acting on a stale or already-transitioned mission. */
  function transition(missionId: string, from: MissionStatus, patch: Partial<Mission>): boolean {
    const mission = allMissions.find((m) => m.id === missionId)
    if (!mission || mission.status !== from) return false
    updateMission(missionId, patch)
    return true
  }

  function acceptMission(missionId: string) {
    if (!transition(missionId, 'PENDING', { status: 'ACCEPTED', acceptedAt: now().toISOString() })) return
    notifyDispatcher(missionId, 'MISSION_STATUS_CHANGED', `${session?.name ?? 'Responder'} accepted the mission.`)
  }

  /** Declining leaves the mission DECLINED and the responder returns to waiting; the incident remains available for Command Staff to reassign. */
  function declineMission(missionId: string) {
    if (!transition(missionId, 'PENDING', { status: 'DECLINED', declinedAt: now().toISOString() })) return
    notifyDispatcher(
      missionId,
      'MISSION_STATUS_CHANGED',
      `${session?.name ?? 'Responder'} declined the mission — awaiting reassignment.`,
    )
  }

  /** ACCEPTED -> EN_ROUTE, once the responder starts navigating to the incident. */
  function startNavigation(missionId: string) {
    if (!transition(missionId, 'ACCEPTED', { status: 'EN_ROUTE', enRouteAt: now().toISOString() })) return
    notifyDispatcher(missionId, 'MISSION_STATUS_CHANGED', `${session?.name ?? 'Responder'} is en route to the incident.`)
  }

  /**
   * EN_ROUTE -> ON_SITE, once the responder arrives at the incident location.
   * Also moves the incident to IN_PROGRESS — this is the "monitor responder
   * status" signal Command Staff sees on the incident/dashboard/map.
   */
  function arriveOnSite(missionId: string) {
    const mission = allMissions.find((m) => m.id === missionId)
    if (!transition(missionId, 'EN_ROUTE', { status: 'ON_SITE', onSiteAt: now().toISOString() })) return
    if (mission) {
      updateIncident(mission.incidentId, { status: 'IN_PROGRESS' })
    }
    notifyDispatcher(missionId, 'RESPONDER_ON_SITE', `${session?.name ?? 'Responder'} has arrived on-site.`)
  }

  /** ON_SITE -> COMPLETED, once the responder reports the rescue finished. */
  function completeMission(missionId: string) {
    if (!transition(missionId, 'ON_SITE', { status: 'COMPLETED', completedAt: now().toISOString() })) return
    notifyDispatcher(missionId, 'MISSION_COMPLETED', `${session?.name ?? 'Responder'} completed the mission.`)
  }

  return (
    <FieldResponderDataContext.Provider
      value={{ missions, acceptMission, declineMission, startNavigation, arriveOnSite, completeMission }}
    >
      {children}
    </FieldResponderDataContext.Provider>
  )
}

export function useFieldResponderData() {
  const ctx = useContext(FieldResponderDataContext)
  if (!ctx) {
    throw new Error('useFieldResponderData must be used within a FieldResponderDataProvider')
  }
  return ctx
}
