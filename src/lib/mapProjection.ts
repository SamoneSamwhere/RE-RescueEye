import type { GeoPoint } from '../types/geo'

interface Bounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

/** Bounding box across every point being plotted, so the map fits them all. */
export function computeBounds(points: GeoPoint[]): Bounds {
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  }
}

/**
 * Projects a real lat/lng onto a percentage-based position within a
 * rectangular preview panel (simple linear/equirectangular projection —
 * fine at city scale, not meant for wide geographic spans). Latitude is
 * inverted since higher latitude renders further up the panel.
 */
export function projectToPercent(point: GeoPoint, bounds: Bounds, paddingPercent = 12): { top: string; left: string } {
  const latRange = bounds.maxLat - bounds.minLat || 0.001
  const lngRange = bounds.maxLng - bounds.minLng || 0.001
  const usable = 100 - paddingPercent * 2

  const top = paddingPercent + ((bounds.maxLat - point.lat) / latRange) * usable
  const left = paddingPercent + ((point.lng - bounds.minLng) / lngRange) * usable

  return { top: `${top}%`, left: `${left}%` }
}
