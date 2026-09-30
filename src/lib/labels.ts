import type {
  DetectionCategory,
  DamageClassification,
  SceneDamageLabel,
  SceneDamageSeverity,
} from '../types/detection'
import type { IncidentPriority, IncidentStatus } from '../types/incident'
import type { UserRole } from '../types/user'
import type { AgencyRegistrationStatus } from '../types/agency'

/** Shared display labels — single source of truth so every screen reads the same wording. */

export const DETECTION_CATEGORY_LABEL: Record<DetectionCategory, string> = {
  CASUALTY: 'Casualty',
  DAMAGE: 'Damage',
}

export const SCENE_DAMAGE_LABEL: Record<SceneDamageLabel, string> = {
  fire_damage: 'Fire damage',
  flood_damage: 'Flood damage',
  structural_damage: 'Structural damage',
  no_damage: 'No damage',
}

export const SCENE_SEVERITY_LABEL: Record<SceneDamageSeverity, string> = {
  CRITICAL: 'Critical',
  MODERATE: 'Moderate',
  MINOR: 'Minor',
  CLEAR: 'Clear',
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

export const INCIDENT_PRIORITY_LABEL: Record<IncidentPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
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

/**
 * Plain wording for the casualty gate's reason codes (api/services/casualty.py).
 *
 * The codes are written for logs and tests. A commander deciding whether to
 * send responders needs to know which evidence fired, so each one gets a short
 * phrase; anything unmapped falls back to the raw code rather than vanishing,
 * because a silently dropped reason is worse than an ugly one.
 */
export const CASUALTY_REASON_LABEL: Record<string, string> = {
  posture_from_pose: 'Lying down (side view)',
  posture_from_pose_nadir: 'Lying down (overhead)',
  posture_from_bbox: 'Shape only — weak signal',
  posture_foreshortened: 'Posture unreadable at this angle',
  posture_no_torso: 'Torso not visible',
  posture_no_shoulder_width: 'Shoulders not visible',
  posture_keypoints_outside_box: 'Pose did not match the subject',
  posture_torso_implausible: 'Pose did not match the subject',
  posture_unavailable: 'No pose reading',
  stillness_measured: 'Has not moved',
  stillness_warming_up: 'Still measuring movement',
  stillness_window_short: 'Still measuring movement',
  stillness_camera_unknown: 'Camera motion unknown',
  stillness_untracked: 'Not tracked across frames',
  known_responder: 'Matched a known responder',
  responder_veto_unavailable_no_subject_position: 'No subject position for responder check',
  no_qualifying_signal: 'No qualifying evidence',
  gate_disabled: 'Casualty gate disabled',
}

/** Reasons that count as evidence for, rather than notes about, a casualty. */
export const SUPPORTING_CASUALTY_REASONS = new Set([
  'posture_from_pose',
  'posture_from_pose_nadir',
  'stillness_measured',
])
