import type { Mission } from '../types/mission'

export const mockMissions: Mission[] = [
  // Incident 1 (CRITICAL) — first responder declined, reassigned and now en route
  {
    id: 'mission-1',
    incidentId: 'incident-1',
    responderUserId: 'usr-field-responder-2', // Diego Fuentes
    dispatchedByUserId: 'usr-command-staff-1',
    status: 'DECLINED',
    dispatchedAt: '2026-08-20T14:02:00Z',
    declinedAt: '2026-08-20T14:03:30Z',
  },
  {
    id: 'mission-2',
    incidentId: 'incident-1',
    responderUserId: 'usr-field-responder-1', // Casey Nolan
    dispatchedByUserId: 'usr-command-staff-1',
    status: 'EN_ROUTE',
    dispatchedAt: '2026-08-20T14:04:00Z',
    acceptedAt: '2026-08-20T14:04:45Z',
    enRouteAt: '2026-08-20T14:06:00Z',
  },

  // Incident 2 (HIGH) — responder on site performing the rescue
  {
    id: 'mission-3',
    incidentId: 'incident-2',
    responderUserId: 'usr-field-responder-3', // Harper Lin
    dispatchedByUserId: 'usr-command-staff-1',
    status: 'ON_SITE',
    dispatchedAt: '2026-08-20T13:46:00Z',
    acceptedAt: '2026-08-20T13:47:00Z',
    enRouteAt: '2026-08-20T13:49:00Z',
    onSiteAt: '2026-08-20T14:02:00Z',
  },

  // Incident 4 (MEDIUM) — just dispatched, awaiting responder's accept/decline
  {
    id: 'mission-4',
    incidentId: 'incident-4',
    responderUserId: 'usr-field-responder-4', // Sam Okafor
    dispatchedByUserId: 'usr-command-staff-2',
    status: 'PENDING',
    dispatchedAt: '2026-08-20T14:11:00Z',
  },

  // Incident 5 (LOW) — accepted, not yet en route
  {
    id: 'mission-5',
    incidentId: 'incident-5',
    responderUserId: 'usr-field-responder-5', // Robin Kessler
    dispatchedByUserId: 'usr-command-staff-2',
    status: 'ACCEPTED',
    dispatchedAt: '2026-08-20T10:14:00Z',
    acceptedAt: '2026-08-20T10:16:00Z',
  },

  // Incident 6 (LOW, closed) — resolved yesterday
  {
    id: 'mission-6',
    incidentId: 'incident-6',
    responderUserId: 'usr-field-responder-1', // Casey Nolan
    dispatchedByUserId: 'usr-command-staff-1',
    status: 'COMPLETED',
    dispatchedAt: '2026-08-19T16:28:00Z',
    acceptedAt: '2026-08-19T16:30:00Z',
    enRouteAt: '2026-08-19T16:34:00Z',
    onSiteAt: '2026-08-19T17:05:00Z',
    completedAt: '2026-08-19T18:05:00Z',
  },
]
