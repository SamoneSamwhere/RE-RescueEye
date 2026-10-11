import type { UserRole } from '../types/user'

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
  agencyAdminTeams: '/agency-admin/teams',
  agencyAdminIncidentHistory: '/agency-admin/incident-history',
  agencyAdminSettings: '/agency-admin/settings',
  commandStaff: '/command-staff',
  commandStaffDrones: '/command-staff/drones',
  commandStaffMediaLibrary: '/command-staff/media-library',
  commandStaffLiveMonitoring: '/command-staff/live-monitoring',
  commandStaffDetections: '/command-staff/detections',
  commandStaffLogs: '/command-staff/logs',
  commandStaffIncidents: '/command-staff/incidents',
  commandStaffIncidentDetail: '/command-staff/incidents/:incidentId',
  commandStaffMap: '/command-staff/map',
  commandStaffSettings: '/command-staff/settings',
  fieldResponder: '/field-responder',
  fieldResponderMap: '/field-responder/map',
  fieldResponderProfile: '/field-responder/profile',
  fieldResponderSettings: '/field-responder/settings',
  fieldResponderMissionDetail: '/field-responder/mission/:missionId',
  fieldResponderMissionNavigate: '/field-responder/mission/:missionId/navigate',
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

export function fieldResponderMissionNavigatePath(missionId: string): string {
  return `/field-responder/mission/${missionId}/navigate`
}

/** The settings page for a role, used by both the sidebar and the profile menu. */
export function settingsRouteFor(role: UserRole | undefined): string | null {
  switch (role) {
    case 'SYSTEM_ADMIN':
      return ROUTES.systemAdminSettings
    case 'AGENCY_ADMIN':
      return ROUTES.agencyAdminSettings
    case 'COMMAND_STAFF':
      return ROUTES.commandStaffSettings
    case 'FIELD_RESPONDER':
      return ROUTES.fieldResponderSettings
    default:
      return null
  }
}
