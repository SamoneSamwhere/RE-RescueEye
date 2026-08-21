export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type IncidentStatus = 'OPEN' | 'DISPATCHED' | 'IN_PROGRESS' | 'CLOSED'

/**
 * A confirmed operational incident. Always created from a Detection whose
 * validationStatus is VERIFIED — detectionId is required and must never
 * point to a PENDING or REJECTED Detection. This is the boundary between
 * AI output and operational reality: Command Staff verification is what
 * creates an Incident, never the AI on its own.
 */
export interface Incident {
  id: string
  detectionId: string
  agencyId: string
  priority: IncidentPriority
  status: IncidentStatus
  verifiedByUserId: string
  verifiedAt: string
  closedByUserId?: string
  closedAt?: string
}
