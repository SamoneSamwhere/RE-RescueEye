import type { DetectionCategory, DamageClassification } from '../types/detection'
import type { IncidentStatus } from '../types/incident'
import type { UserRole } from '../types/user'
import type { AgencyRegistrationStatus } from '../types/agency'

/** Shared display labels — single source of truth so every screen reads the same wording. */

export const DETECTION_CATEGORY_LABEL: Record<DetectionCategory, string> = {
  CASUALTY: 'Casualty',
  DAMAGE: 'Damage',
}

export const DAMAGE_CLASSIFICATION_LABEL: Record<DamageClassification, string> = {
  STRUCTURAL: 'Structural',
  UTILITY: 'Utility',
  PROPERTY: 'Property',
}

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  OPEN: 'Open',
  DISPATCHED: 'Dispatched',
  IN_PROGRESS: 'In Progress',
  CLOSED: 'Closed',
}

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  SYSTEM_ADMIN: 'System Admin',
  AGENCY_ADMIN: 'Agency Admin',
  COMMAND_STAFF: 'Command Staff',
  FIELD_RESPONDER: 'Field Responder',
}

export const AGENCY_REGISTRATION_STATUS_LABEL: Record<AgencyRegistrationStatus, string> = {
  PENDING: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  RESUBMISSION_REQUIRED: 'Resubmission Required',
}

export const AGENCY_REGISTRATION_STATUS_TONE: Record<AgencyRegistrationStatus, 'warning' | 'success' | 'danger' | 'info'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  RESUBMISSION_REQUIRED: 'info',
}
