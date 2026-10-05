import type { GeoPoint } from '../../../types/geo'
import type { IncidentPriority, IncidentStatus } from '../../../types/incident'
import type { DetectionCategory, DamageClassification, DetectionValidationStatus } from '../../../types/detection'
import type { MissionStatus } from '../../../types/mission'
import type { UserAccountStatus } from '../../../types/user'

export interface IncidentMapMarker {
  kind: 'INCIDENT'
  id: string
  location: GeoPoint
  incidentId: string
  priority: IncidentPriority
  status: IncidentStatus
  detectionId: string
  detectionCategory: DetectionCategory
  damageClassification?: DamageClassification
  verifiedAt: string
}

export interface DetectionMapMarker {
  kind: 'DETECTION'
  id: string
  location: GeoPoint
  detectionId: string
  category: DetectionCategory
  damageClassification?: DamageClassification
  confidence: number
  validationStatus: DetectionValidationStatus
  detectedAt: string
}

export interface ResponderMapMarker {
  kind: 'RESPONDER'
  id: string
  location: GeoPoint
  responderId: string
  name: string
  accountStatus: UserAccountStatus
  missionId?: string
  missionStatus?: MissionStatus
  missionIncidentPriority?: IncidentPriority
}

export type MapMarker = IncidentMapMarker | DetectionMapMarker | ResponderMapMarker
