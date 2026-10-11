import type { GeoPoint } from '../types/geo'

/** Google Maps turn-by-turn driving directions from the device's location to `destination`. */
export function googleMapsDirectionsUrl(destination: GeoPoint): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`
}
