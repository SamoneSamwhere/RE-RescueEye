import type { IncidentPriority, IncidentStatus } from '../../../types/incident'
import type {
  BoundingBox,
  DamageClassification,
  DetectionCategory,
  DetectionLocation,
  DetectionValidationStatus,
} from '../../../types/detection'

/** Incident enriched with its linked detection's evidence, for list + detail views. */
export interface EnrichedIncident {
  id: string
  priority: IncidentPriority
  status: IncidentStatus
  verifiedAt: string
  verifiedByName: string
  closedAt?: string
  closedByName?: string
  detectionId: string
  detectionCategory: DetectionCategory
  damageClassification?: DamageClassification
  confidence: number
  boundingBox: BoundingBox
  location: DetectionLocation
  detectionValidationStatus: DetectionValidationStatus
  detectionDetectedAt: string
  detectionReviewerNotes?: string
  sourceLabel: string
}
