/**
 * Marks a drone as session-only.
 *
 * Demo ids are deliberately non-numeric so a demo drone can never be mistaken
 * for a Supabase row id and sent to the database by accident.
 *
 * Kept out of CommandStaffDataProvider on purpose: that module creates a React
 * context at module scope, and mixing plain exports into it breaks Fast
 * Refresh's ability to preserve the provider across edits — the failure mode
 * being a re-evaluated context object and a "must be used within a
 * CommandStaffDataProvider" throw from a consumer still holding the old one.
 */
export const DEMO_DRONE_ID_PREFIX = 'demo-drone-'

export function isDemoDroneId(droneId: string): boolean {
  return droneId.startsWith(DEMO_DRONE_ID_PREFIX)
}
