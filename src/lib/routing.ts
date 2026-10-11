import type { GeoPoint } from '../types/geo'

/**
 * Turn-by-turn routing for in-app navigation, from the public OSRM server
 * (OpenStreetMap data, no API key). Also the geometry navigation needs: where
 * the responder is along the route, how far off it they are, and what the next
 * maneuver is.
 */

const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving'

export type ManeuverIcon =
  | 'depart'
  | 'straight'
  | 'left'
  | 'right'
  | 'slight-left'
  | 'slight-right'
  | 'sharp-left'
  | 'sharp-right'
  | 'uturn'
  | 'roundabout'
  | 'arrive'

export interface RouteStep {
  /** e.g. "Turn left onto Osmeña Blvd" */
  instruction: string
  /** Street the step continues on; empty when OSM has no name for it. */
  street: string
  icon: ManeuverIcon
  /** Metres along the route at which this step's maneuver happens. */
  startDistance: number
}

export interface NavRoute {
  points: GeoPoint[]
  /** cumulative[i] = metres along the route at points[i]. */
  cumulative: number[]
  /** Total length in metres. */
  distance: number
  /** OSRM's estimated driving time for the whole route, in seconds. */
  duration: number
  steps: RouteStep[]
}

interface OsrmStep {
  distance: number
  name: string
  maneuver: { type: string; modifier?: string; exit?: number; location: [number, number] }
}

interface OsrmResponse {
  code: string
  message?: string
  routes?: {
    distance: number
    duration: number
    geometry: { coordinates: [number, number][] }
    legs: { steps: OsrmStep[] }[]
  }[]
}

const EARTH_RADIUS_M = 6_371_000
const toRad = (deg: number) => (deg * Math.PI) / 180
const toDeg = (rad: number) => (rad * 180) / Math.PI

export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial compass bearing from a to b, degrees clockwise from north (0–360). */
export function bearingDegrees(a: GeoPoint, b: GeoPoint): number {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function cumulativeDistances(points: GeoPoint[]): number[] {
  const result = [0]
  for (let i = 1; i < points.length; i++) result.push(result[i - 1] + distanceMeters(points[i - 1], points[i]))
  return result
}

/**
 * Closest point on segment a→b to p, in a local metric frame anchored at a
 * (accurate to well under a metre over a road segment's length).
 */
function projectOnSegment(p: GeoPoint, a: GeoPoint, b: GeoPoint): { offset: number; t: number } {
  const kx = 111_320 * Math.cos(toRad(a.lat))
  const ky = 110_540
  const bx = (b.lng - a.lng) * kx
  const by = (b.lat - a.lat) * ky
  const px = (p.lng - a.lng) * kx
  const py = (p.lat - a.lat) * ky
  const len2 = bx * bx + by * by
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2))
  return { offset: Math.hypot(px - t * bx, py - t * by), t }
}

export interface RouteProgress {
  /** Metres along the route of the closest point to the responder. */
  along: number
  /** How far the responder is from the route line, in metres. */
  offRouteBy: number
  /** Index of the route segment that closest point is on. */
  segment: number
}

/** Where `p` is relative to the route, searching segments from `fromSegment` on. */
export function projectOntoRoute(route: Pick<NavRoute, 'points' | 'cumulative'>, p: GeoPoint, fromSegment = 0): RouteProgress {
  const { points, cumulative } = route
  if (points.length < 2) return { along: 0, offRouteBy: points[0] ? distanceMeters(p, points[0]) : 0, segment: 0 }
  let best: RouteProgress = { along: 0, offRouteBy: Infinity, segment: fromSegment }
  for (let i = fromSegment; i < points.length - 1; i++) {
    const { offset, t } = projectOnSegment(p, points[i], points[i + 1])
    if (offset < best.offRouteBy) {
      best = { along: cumulative[i] + t * (cumulative[i + 1] - cumulative[i]), offRouteBy: offset, segment: i }
    }
  }
  return best
}

/** The point `distance` metres along the route (clamped to its ends). */
export function pointAlongRoute(route: NavRoute, distance: number): GeoPoint {
  const { points, cumulative } = route
  if (distance <= 0) return points[0]
  for (let i = 0; i < points.length - 1; i++) {
    if (cumulative[i + 1] >= distance) {
      const span = cumulative[i + 1] - cumulative[i]
      const t = span === 0 ? 0 : (distance - cumulative[i]) / span
      return {
        lat: points[i].lat + t * (points[i + 1].lat - points[i].lat),
        lng: points[i].lng + t * (points[i + 1].lng - points[i].lng),
      }
    }
  }
  return points[points.length - 1]
}

const MODIFIER_ICON: Record<string, ManeuverIcon> = {
  left: 'left',
  right: 'right',
  'slight left': 'slight-left',
  'slight right': 'slight-right',
  'sharp left': 'sharp-left',
  'sharp right': 'sharp-right',
  uturn: 'uturn',
  straight: 'straight',
}

/** OSRM maneuver → the sentence and icon shown in the instruction banner. */
function describeManeuver(step: OsrmStep): { instruction: string; icon: ManeuverIcon } {
  const { type, modifier, exit } = step.maneuver
  const onto = step.name ? ` onto ${step.name}` : ''
  const icon = (modifier && MODIFIER_ICON[modifier]) || 'straight'
  const direction = modifier && modifier !== 'straight' ? ` ${modifier}` : ''

  switch (type) {
    case 'depart':
      return { instruction: step.name ? `Head along ${step.name}` : 'Head toward the route', icon: 'depart' }
    case 'arrive':
      return { instruction: 'Arrive at the incident', icon: 'arrive' }
    case 'roundabout':
    case 'rotary':
    case 'roundabout turn':
      return {
        instruction: exit ? `At the roundabout, take exit ${exit}${onto}` : `Enter the roundabout${onto}`,
        icon: 'roundabout',
      }
    case 'merge':
      return { instruction: `Merge${direction}${onto}`, icon }
    case 'on ramp':
      return { instruction: `Take the ramp${direction}${onto}`, icon }
    case 'off ramp':
      return { instruction: `Take the exit${direction}${onto}`, icon }
    case 'fork':
      return { instruction: `Keep ${modifier ?? 'straight'} at the fork${onto}`, icon }
    case 'end of road':
      return { instruction: `Turn${direction} at the end of the road${onto}`, icon }
    default:
      // 'turn', 'continue', 'new name', 'notification', ...
      if (modifier === 'uturn') return { instruction: `Make a U-turn${onto}`, icon: 'uturn' }
      if (!modifier || modifier === 'straight' || type === 'continue' || type === 'new name') {
        return { instruction: `Continue${direction}${onto}`, icon }
      }
      return { instruction: `Turn${direction}${onto}`, icon }
  }
}

/** Fetches a driving route from `from` to `to`. Throws with a readable message on failure. */
export async function fetchRoute(from: GeoPoint, to: GeoPoint, signal?: AbortSignal): Promise<NavRoute> {
  const url = `${OSRM_ROUTE_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`
  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('Cannot reach the routing service. Check your connection.')
  }
  if (!response.ok) throw new Error(`Routing service error (${response.status}).`)
  const body = (await response.json()) as OsrmResponse
  const route = body.routes?.[0]
  if (body.code !== 'Ok' || !route) throw new Error(body.message ?? 'No route found to the incident.')

  const points = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))
  const cumulative = cumulativeDistances(points)

  // Each maneuver is located on the polyline itself (searching forward from the
  // previous one), so step positions and the responder's progress share one
  // measure and "distance to the turn" is consistent.
  let fromSegment = 0
  const steps = route.legs
    .flatMap((leg) => leg.steps)
    .map((step): RouteStep => {
      const [lng, lat] = step.maneuver.location
      const located = projectOntoRoute({ points, cumulative }, { lat, lng }, fromSegment)
      fromSegment = located.segment
      return { ...describeManeuver(step), street: step.name, startDistance: located.along }
    })

  return { points, cumulative, distance: cumulative[cumulative.length - 1], duration: route.duration, steps }
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(0, Math.round(meters / 10) * 10)} m`
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}
