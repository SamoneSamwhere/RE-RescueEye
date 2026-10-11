import type { Detection, DetectionCategory } from '../types/detection'

/** The database's Incident_Type enum. */
export type IncidentType = 'VICTIM_DETECTED' | 'FLOOD' | 'FIRE' | 'STRUCTURAL' | 'UNKNOWN'

/** Which database incident type a verified detection becomes. */
export function incidentTypeFor(detection: Detection): IncidentType {
  if (detection.category === 'CASUALTY') return 'VICTIM_DETECTED'
  switch (detection.sceneDamage?.label) {
    case 'fire_damage':
      return 'FIRE'
    case 'flood_damage':
      return 'FLOOD'
    case 'structural_damage':
      return 'STRUCTURAL'
  }
  if (detection.damageClassification === 'STRUCTURAL') return 'STRUCTURAL'
  return 'UNKNOWN'
}

/** The reverse, for a responder's device that only has the database row: what to show the incident as. */
export function detectionCategoryFor(type: IncidentType): DetectionCategory {
  return type === 'VICTIM_DETECTED' ? 'CASUALTY' : 'DAMAGE'
}

const SEVERITY_WORD = { CRITICAL: 'Major', MODERATE: 'Moderate', MINOR: 'Minor', CLEAR: '' } as const
const SCENE_NAME = {
  fire_damage: 'Fire Damage',
  flood_damage: 'Flood Damage',
  structural_damage: 'Structural Damage',
  no_damage: 'Damage',
} as const
const CLASSIFICATION_NAME = { STRUCTURAL: 'Structural Damage', UTILITY: 'Utility Damage', PROPERTY: 'Property Damage' } as const

/** The full label an alert carries, e.g. "Major Fire Damage" or "Casualty Detected". */
export function alertLabelFor(detection: Detection): string {
  if (detection.category === 'CASUALTY') return 'Casualty Detected'
  if (detection.sceneDamage) {
    const word = SEVERITY_WORD[detection.sceneDamage.severity]
    return `${word ? `${word} ` : ''}${SCENE_NAME[detection.sceneDamage.label]}`
  }
  if (detection.damageClassification) return CLASSIFICATION_NAME[detection.damageClassification]
  return 'Damage Detected'
}

/** A record id that came from the database (numeric) rather than an in-memory mock ("incident-…", "usr-…"). */
export function isDbId(id: string | undefined | null): boolean {
  return !!id && /^\d+$/.test(id)
}
