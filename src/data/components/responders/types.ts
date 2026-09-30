import type { UserAccountStatus } from '../../../types/user'
import type { MissionStatus } from '../../../types/mission'
import type { IncidentPriority } from '../../../types/incident'
import type { GeoPoint } from '../../../types/geo'

/**
 * A Field Responder as a dispatch candidate for one specific incident —
 * not a Team, not a roster. Distance and availability are computed
 * relative to the incident being viewed.
 */
export interface ResponderCandidate {
  id: string
  name: string
  accountStatus: UserAccountStatus
  currentLocation?: GeoPoint
  distanceKm: number | null
  missionStatus?: MissionStatus
  missionIncidentPriority?: IncidentPriority
  isAvailable: boolean
  /** The response team this person belongs to, if any — grouping only; dispatch is still to this one person. */
  teamName?: string
}
