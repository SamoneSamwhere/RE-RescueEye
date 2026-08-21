import { now } from './now'
import type { Detection, DetectionCategory, DamageClassification } from '../types/detection'
import type { GeoPoint } from '../types/geo'

const DAMAGE_CLASSIFICATIONS: DamageClassification[] = ['STRUCTURAL', 'UTILITY', 'PROPERTY']

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function jitter(base: GeoPoint): GeoPoint {
  return { lat: base.lat + randomBetween(-0.015, 0.015), lng: base.lng + randomBetween(-0.015, 0.015) }
}

/**
 * Mock AI inference — simulates a drone/media asset producing exactly one
 * AI detection, the same shape a real model would emit. No real inference:
 * category/confidence/bounding box are randomized within plausible ranges.
 * Always PENDING — AI output never becomes an incident by itself; only
 * Command Staff verification (see CommandStaffDataProvider.verifyDetection)
 * can do that.
 */
export function runMockDetection(mediaAssetId: string, areaCenter: GeoPoint): Omit<Detection, 'id'> {
  const category: DetectionCategory = Math.random() < 0.5 ? 'CASUALTY' : 'DAMAGE'
  const damageClassification =
    category === 'DAMAGE'
      ? DAMAGE_CLASSIFICATIONS[Math.floor(Math.random() * DAMAGE_CLASSIFICATIONS.length)]
      : undefined

  return {
    mediaAssetId,
    category,
    damageClassification,
    confidence: Math.round(randomBetween(0.6, 0.96) * 100) / 100,
    boundingBox: {
      x: Math.round(randomBetween(10, 65)),
      y: Math.round(randomBetween(10, 65)),
      width: Math.round(randomBetween(12, 25)),
      height: Math.round(randomBetween(12, 25)),
    },
    location: jitter(areaCenter),
    detectedAt: now().toISOString(),
    validationStatus: 'PENDING',
  }
}
