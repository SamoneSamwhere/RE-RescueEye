import type { MissionStatus } from '../types/mission'

/**
 * Mission is currently being worked (dispatched but not yet resolved).
 * Used to: mark a responder as busy/unavailable for dispatch, count "active
 * missions" on dashboards, and block dispatching a second responder to an
 * incident that already has one of these in flight.
 */
export const ACTIVE_MISSION_STATUSES = new Set<MissionStatus>(['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ON_SITE'])

/**
 * Same as ACTIVE_MISSION_STATUSES plus COMPLETED — used only by the
 * operational map, which shows a responder's most recent mission status
 * (including a just-finished one) rather than only in-flight missions.
 */
export const MAP_VISIBLE_MISSION_STATUSES = new Set<MissionStatus>([
  'PENDING',
  'ACCEPTED',
  'EN_ROUTE',
  'ON_SITE',
  'COMPLETED',
])

/**
 * Field Responder's own "I currently have a mission" check — PENDING is
 * intentionally excluded here because the responder home screen handles a
 * PENDING mission as a separate notification-to-respond-to state, not as
 * an in-progress mission.
 */
export const FIELD_RESPONDER_ACTIVE_STATUSES = new Set<MissionStatus>(['ACCEPTED', 'EN_ROUTE', 'ON_SITE'])
