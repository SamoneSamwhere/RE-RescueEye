/**
 * Filter state for the stored media library.
 *
 * Kept out of MediaFilterBar.tsx so that file exports only its component —
 * mixing plain exports into a component module breaks Fast Refresh's ability
 * to preserve state across edits.
 */
export interface MediaFilters {
  droneId: string
  missionId: string
  /** Inclusive lower bound, `yyyy-mm-dd` from a native date input. Empty means unbounded. */
  from: string
  /** Inclusive upper bound, same shape. */
  to: string
}

export const EMPTY_MEDIA_FILTERS: MediaFilters = { droneId: '', missionId: '', from: '', to: '' }

export function hasActiveFilters(f: MediaFilters): boolean {
  return !!(f.droneId || f.missionId || f.from || f.to)
}
