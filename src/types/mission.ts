export type MissionStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EN_ROUTE'
  | 'ON_SITE'
  | 'COMPLETED'

/** The dispatch of a verified Incident to a specific Field Responder. */
export interface Mission {
  id: string
  incidentId: string
  responderUserId: string
  dispatchedByUserId: string
  status: MissionStatus
  dispatchedAt: string
  acceptedAt?: string
  declinedAt?: string
  enRouteAt?: string
  onSiteAt?: string
  completedAt?: string
}
