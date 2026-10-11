import { distanceKm } from './geo'
import type { GeoPoint } from '../types/geo'

/** Google Maps turn-by-turn driving directions from the device's location to `destination`. */
export function googleMapsDirectionsUrl(destination: GeoPoint): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`
}

/**
 * How close the responder's GPS must be to the incident before Arrive On-Site
 * unlocks. Phone GPS is typically 5–20 m off; 100 m leaves room for that and
 * for parking a short way from the exact pin, without letting anyone arrive
 * from across town.
 */
export const ARRIVE_RADIUS_M = 100

export interface ArrivalCheck {
  canArrive: boolean
  /** Metres from the responder to the incident; null without a GPS fix. */
  distanceM: number | null
}

/** Whether a responder at `position` is close enough to `incident` to arrive. */
export function checkArrival(position: GeoPoint | null, incident: GeoPoint | undefined): ArrivalCheck {
  if (!position || !incident) return { canArrive: false, distanceM: null }
  const distanceM = distanceKm(position, incident) * 1000
  return { canArrive: distanceM <= ARRIVE_RADIUS_M, distanceM }
}
