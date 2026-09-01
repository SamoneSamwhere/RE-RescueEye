import type { IncidentPriority } from '../../types/incident'
import type { DetectionCategory, DamageClassification, DetectionLocation } from '../../types/detection'

/** Everything the Field Responder needs to decide whether to accept a pending mission. */
export interface PendingMissionSummary {
  missionId: string
  incidentId: string
  priority: IncidentPriority
  detectionCategory: DetectionCategory
  damageClassification?: DamageClassification
  location: DetectionLocation
  dispatchedAt: string
}
