export const ROUTES = {
  login: '/login',
  signup: '/signup',
  unauthorized: '/unauthorized',
  systemAdmin: '/system-admin',
  systemAdminAgencyValidation: '/system-admin/agencies/validation',
  systemAdminAgencyStatus: '/system-admin/agencies/status',
  agencyAdmin: '/agency-admin',
  agencyAdminUserCreation: '/agency-admin/users/new',
  agencyAdminAccountStatus: '/agency-admin/users',
  agencyAdminMissionHistory: '/agency-admin/mission-history',
  commandStaff: '/command-staff',
  commandStaffMedia: '/command-staff/drones-media',
  commandStaffDetections: '/command-staff/detections',
  commandStaffIncidents: '/command-staff/incidents',
  commandStaffIncidentDetail: '/command-staff/incidents/:incidentId',
  commandStaffMap: '/command-staff/map',
  fieldResponder: '/field-responder',
  fieldResponderProfile: '/field-responder/profile',
  fieldResponderMissionDetail: '/field-responder/mission/:missionId',
} as const

export function commandStaffIncidentDetailPath(incidentId: string): string {
  return `/command-staff/incidents/${incidentId}`
}

export function fieldResponderMissionDetailPath(missionId: string): string {
  return `/field-responder/mission/${missionId}`
}
