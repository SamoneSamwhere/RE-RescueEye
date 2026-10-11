import { useMemo } from 'react'
import { mockUsers } from '../data/mockUsers'
import { ACTIVE_MISSION_STATUSES } from '../lib/missionStatus'
import { distanceKm } from '../lib/geo'
import { useLiveUpdates } from '../state/LiveUpdatesStore'
import type { ResponderCandidate } from '../components/responders'
import type { Detection } from '../types/detection'
import type { Incident } from '../types/incident'
import type { Mission } from '../types/mission'

/**
 * Builds the nearest-first list of Field Responder dispatch candidates for
 * one detection's location, scoped to the given agency. A responder counts
 * as busy (unavailable) if they have any mission in an active status.
 */
export function useResponderCandidates(
  detection: Detection | null,
  agencyId: string | undefined,
  incidents: Incident[],
  missions: Mission[],
): ResponderCandidate[] {
  const { positions } = useLiveUpdates()

  return useMemo(() => {
    if (!detection || !agencyId) return []

    const agencyResponders = mockUsers.filter((u) => u.role === 'FIELD_RESPONDER' && u.agencyId === agencyId)

    return agencyResponders
      .map((responder): ResponderCandidate => {
        const activeMission = missions.find(
          (mission) => mission.responderUserId === responder.id && ACTIVE_MISSION_STATUSES.has(mission.status),
        )
        const missionIncident = activeMission ? incidents.find((i) => i.id === activeMission.incidentId) : undefined

        // Live device GPS when the responder has reported; their profile location otherwise.
        const live = positions[responder.id]
        const currentLocation = live ? { lat: live.lat, lng: live.lng } : responder.currentLocation

        return {
          id: responder.id,
          name: responder.name,
          accountStatus: responder.accountStatus,
          currentLocation,
          distanceKm: currentLocation ? distanceKm(currentLocation, detection.location) : null,
          missionStatus: activeMission?.status,
          missionIncidentPriority: missionIncident?.priority,
          isAvailable: responder.accountStatus === 'ACTIVE' && !activeMission,
        }
      })
      .sort((a, b) => {
        if (a.distanceKm === null) return 1
        if (b.distanceKm === null) return -1
        return a.distanceKm - b.distanceKm
      })
  }, [detection, agencyId, incidents, missions, positions])
}
