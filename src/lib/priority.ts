import type { Detection } from '../types/detection'
import type { IncidentPriority } from '../types/incident'

/**
 * AI-suggested priority for a detection awaiting review. This is a starting
 * point for Command Staff, never a final decision — it only ever becomes an
 * Incident's actual priority if a reviewer accepts (or edits) it and clicks
 * Verify. See DetectionDetailPanel, where it prefills the editable priority
 * select, and CommandStaffDataProvider.verifyDetection, which is the only
 * place an Incident is created.
 *
 * Casualty detections are graded on the casualty gate's own confidence
 * (api/services/casualty.py) since that score already represents "how sure
 * is this a person needing help" — a stronger signal than raw detector
 * confidence for this category. Damage detections prefer the scene
 * classifier's severity verdict when present, falling back to the coarser
 * damage classification, and finally to detector confidence alone for older
 * mock detections that predate both classifiers.
 */
export function suggestPriority(detection: Detection): IncidentPriority {
  if (detection.category === 'CASUALTY') {
    const score = detection.casualtyScore ?? detection.confidence
    if (score >= 0.85) return 'CRITICAL'
    if (score >= 0.6) return 'HIGH'
    return 'MEDIUM'
  }

  if (detection.sceneDamage) {
    switch (detection.sceneDamage.severity) {
      case 'CRITICAL':
        return 'CRITICAL'
      case 'MODERATE':
        return 'HIGH'
      case 'MINOR':
        return 'MEDIUM'
      case 'CLEAR':
        return 'LOW'
    }
  }

  if (detection.damageClassification === 'STRUCTURAL') return 'HIGH'
  if (detection.damageClassification === 'UTILITY') return 'MEDIUM'
  if (detection.damageClassification === 'PROPERTY') return 'LOW'

  if (detection.confidence >= 0.85) return 'HIGH'
  if (detection.confidence >= 0.6) return 'MEDIUM'
  return 'LOW'
}
