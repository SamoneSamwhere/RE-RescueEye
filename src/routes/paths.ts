export const ROUTES = {
  login: '/login',
  signup: '/signup',
  unauthorized: '/unauthorized',
  systemAdmin: '/system-admin',
  systemAdminAgencyValidation: '/system-admin/agencies/validation',
  systemAdminAgencyValidationDetail: '/system-admin/agencies/validation/:agencyId',
  systemAdminAgencyStatus: '/system-admin/agencies/status',
  systemAdminSettings: '/system-admin/settings',
  agencyAdmin: '/agency-admin',
  agencyAdminUserCreation: '/agency-admin/users/new',
  agencyAdminAccountStatus: '/agency-admin/users',
  agencyAdminIncidentHistory: '/agency-admin/incident-history',
  agencyAdminSettings: '/agency-admin/settings',
  commandStaff: '/command-staff',
  commandStaffMedia: '/command-staff/drones-media',
  commandStaffDroneRegistration: '/command-staff/drones/register',
  commandStaffLiveMonitoring: '/command-staff/live-monitoring',
  commandStaffDetections: '/command-staff/detections',
  commandStaffIncidents: '/command-staff/incidents',
  commandStaffIncidentDetail: '/command-staff/incidents/:incidentId',
  commandStaffMap: '/command-staff/map',
  commandStaffSettings: '/command-staff/settings',
  fieldResponder: '/field-responder',
  fieldResponderMap: '/field-responder/map',
  fieldResponderProfile: '/field-responder/profile',
  fieldResponderSettings: '/field-responder/settings',
  fieldResponderMissionDetail: '/field-responder/mission/:missionId',
} as const

export function commandStaffIncidentDetailPath(incidentId: string): string {
  return `/command-staff/incidents/${incidentId}`
}

export function systemAdminAgencyValidationDetailPath(agencyId: string): string {
  return `/system-admin/agencies/validation/${agencyId}`
}

export function fieldResponderMissionDetailPath(missionId: string): string {
  return `/field-responder/mission/${missionId}`
}
