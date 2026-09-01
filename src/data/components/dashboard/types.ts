import type { DetectionCategory, DetectionValidationStatus } from '../../../types/detection'
import type { IncidentPriority, IncidentStatus } from '../../../types/incident'
import type { MissionStatus } from '../../../types/mission'

/** Detection enriched with display-ready fields, derived from mock data by the dashboard page. */
export interface DetectionListItem {
  id: string
  category: DetectionCategory
  confidence: number
  detectedAt: string
  validationStatus: DetectionValidationStatus
  sourceLabel: string
}

/** Incident enriched with display-ready fields for the dashboard's incident panels. */
export interface IncidentListItem {
  id: string
  priority: IncidentPriority
  status: IncidentStatus
  detectionCategory: DetectionCategory
  verifiedAt: string
}

/** Mission enriched with responder/incident display fields for the dashboard's mission panel. */
export interface MissionListItem {
  id: string
  responderName: string
  incidentPriority: IncidentPriority
  status: MissionStatus
  dispatchedAt: string
}

/** A field responder's current operational status, derived from their active mission (if any). */
export interface ResponderStatusItem {
  id: string
  name: string
  isActive: boolean
  missionStatus?: MissionStatus
  incidentPriority?: IncidentPriority
}
