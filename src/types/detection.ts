import type { GeoPoint } from './geo'

/**
 * PENDING = raw AI output, not yet reviewed by a human.
 * VERIFIED = Command Staff confirmed it; this is the only status that may
 *            back an Incident (see Incident.detectionId).
 * REJECTED = Command Staff dismissed it; it must never become an Incident.
 */
export type DetectionValidationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export type DetectionCategory = 'CASUALTY' | 'DAMAGE'

/** Only meaningful when category is DAMAGE — a finer-grained AI classification of the damage. */
export type DamageClassification = 'STRUCTURAL' | 'UTILITY' | 'PROPERTY'

/** Normalized (0-100) box within the source frame, as produced by the AI model. */
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export type DetectionLocation = GeoPoint

/**
 * Raw AI output on a media asset. A Detection is a suggestion, not an
 * operational fact — it never becomes an Incident automatically. Only after
 * a Command Staff member sets validationStatus to VERIFIED can an Incident
 * reference it (see incident.ts).
 */
export interface Detection {
  id: string
  mediaAssetId: string
  category: DetectionCategory
  damageClassification?: DamageClassification
  confidence: number
  boundingBox: BoundingBox
  location: DetectionLocation
  detectedAt: string
  validationStatus: DetectionValidationStatus
  reviewedByUserId?: string
  reviewedAt?: string
  reviewerNotes?: string
}
