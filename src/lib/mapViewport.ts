import type { LatLngBoundsExpression } from 'leaflet'
import { computeBounds } from './mapProjection'
import type { GeoPoint } from '../types/geo'

/**
 * Where a map looks when it has nothing to plot yet: the Cebu City area of
 * interest, matching CEBU_LAT/CEBU_LNG in the API's detection store — the box
 * the drone survey is simulated within.
 */
export const FALLBACK_AOI: LatLngBoundsExpression = [
  [10.28, 123.87],
  [10.35, 123.92],
]

/** Zooming out past this would put a city-scale AOI in a sea of irrelevant map. */
export const MIN_ZOOM = 11

/**
 * Panning limit derived from the points actually on the map, padded so there
 * is context around the edge markers.
 *
 * Deliberately not a fixed box. Coordinates reach the UI from whichever source
 * is feeding it — the simulated Cebu survey area, seeded mock data, or a live
 * deployment somewhere else entirely — and a hard-coded AOI silently makes
 * every marker outside it unreachable: the map rubber-bands away from the very
 * casualty a responder is trying to look at.
 */
export function viewportBounds(points: GeoPoint[]): LatLngBoundsExpression {
  if (!points.length) return FALLBACK_AOI

  const b = computeBounds(points)
  // Minimum pad keeps a single-point map from collapsing to a zero-area box,
  // which Leaflet would treat as "you may not move at all".
  const latPad = Math.max((b.maxLat - b.minLat) * 0.6, 0.02)
  const lngPad = Math.max((b.maxLng - b.minLng) * 0.6, 0.02)

  return [
    [b.minLat - latPad, b.minLng - lngPad],
    [b.maxLat + latPad, b.maxLng + lngPad],
  ]
}
