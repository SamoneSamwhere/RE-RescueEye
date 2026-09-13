import type { IncidentPriority, IncidentStatus } from '../../../types/incident'
import type { MapMarker } from './types'

/**
 * Filter state for the Damage Map's markers.
 *
 * Kept out of MarkerFilterBar.tsx so that file exports only its component —
 * mixing plain exports into a component module breaks Fast Refresh's ability
 * to preserve state across edits.
 *
 * Both axes are multi-select: an empty list means "no constraint on this
 * axis", not "nothing matches". A responder triaging on foot usually wants
 * two or three priorities at once ("show me CRITICAL and HIGH"), which a
 * single-value select cannot express.
 */
export interface MarkerFilters {
  statuses: IncidentStatus[]
  priorities: IncidentPriority[]
}

export const EMPTY_MARKER_FILTERS: MarkerFilters = { statuses: [], priorities: [] }

/** Listed in workflow order so the row reads the way an incident progresses. */
export const FILTERABLE_STATUSES: IncidentStatus[] = ['OPEN', 'DISPATCHED', 'IN_PROGRESS', 'CLOSED']

/** Most urgent first — the priority a responder scans for is the one under their thumb. */
export const FILTERABLE_PRIORITIES: IncidentPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export function hasActiveMarkerFilters(f: MarkerFilters): boolean {
  return f.statuses.length > 0 || f.priorities.length > 0
}

/** Adds `value` if absent, removes it if present — the chip toggle. */
export function toggleFilterValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/**
 * Applies the filters to a marker set.
 *
 * Only INCIDENT markers carry a status and a priority, so only they are
 * filtered. Responder markers are deliberately never hidden: a responder who
 * filtered the map down to CRITICAL incidents must still be able to see where
 * they and their colleagues are, or the map stops being usable for navigation.
 * Detection markers are likewise untouched — their validationStatus is a
 * different vocabulary from IncidentStatus and folding the two together would
 * silently hide verified detections.
 */
export function applyMarkerFilters(markers: MapMarker[], f: MarkerFilters): MapMarker[] {
  if (!hasActiveMarkerFilters(f)) return markers
  return markers.filter((marker) => {
    if (marker.kind !== 'INCIDENT') return true
    if (f.statuses.length > 0 && !f.statuses.includes(marker.status)) return false
    if (f.priorities.length > 0 && !f.priorities.includes(marker.priority)) return false
    return true
  })
}

/** Incident markers are the only ones the filter can remove, so they are what the counter reports. */
export function countIncidentMarkers(markers: MapMarker[]): number {
  return markers.filter((m) => m.kind === 'INCIDENT').length
}
