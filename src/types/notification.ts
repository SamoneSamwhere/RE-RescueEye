/**
 * Command Staff-facing:
 *  - DETECTION_PENDING_REVIEW: a new AI detection requires review
 *  - DETECTION_VERIFIED: a detection was verified
 *  - INCIDENT_CREATED: a verified detection became a confirmed incident
 *  - MISSION_STATUS_CHANGED: a mission's status changed (accepted/declined/en route)
 *  - RESPONDER_ON_SITE: a responder arrived on-site
 *  - MISSION_COMPLETED: a mission was completed
 *
 * Field Responder-facing:
 *  - MISSION_DISPATCH: a new mission was dispatched to them
 *  - MISSION_REASSIGNED: an incident's mission was reassigned to them after a prior decline
 *  - MISSION_STATUS_CHANGED / MISSION_COMPLETED are also used for responder-facing status updates
 *
 *  - SYSTEM: platform-level notices (agency/user administration), unrelated to missions
 */
export type NotificationType =
  | 'DETECTION_PENDING_REVIEW'
  | 'DETECTION_VERIFIED'
  | 'INCIDENT_CREATED'
  | 'MISSION_DISPATCH'
  | 'MISSION_REASSIGNED'
  | 'MISSION_STATUS_CHANGED'
  | 'RESPONDER_ON_SITE'
  | 'MISSION_COMPLETED'
  | 'SYSTEM'

export type NotificationChannel = 'SMS' | 'IN_APP'

/** A notification sent to a user — most commonly a mission alert sent to a Field Responder. */
export interface Notification {
  id: string
  recipientUserId: string
  type: NotificationType
  channel: NotificationChannel
  message: string
  missionId?: string
  sentAt: string
  read: boolean
  readAt?: string
}

/**
 * Lightweight shape used by the application shell's notification bell.
 * Kept separate from Notification: the shell only needs enough to render
 * a dropdown, not the full domain record. `type` is optional so any caller
 * can still hand-build one without a full Notification record; when present
 * it drives the bell's per-type icon.
 */
export interface AppNotification {
  id: string
  title: string
  description?: string
  timestamp: string
  read: boolean
  type?: NotificationType
}
