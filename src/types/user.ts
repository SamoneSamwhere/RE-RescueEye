import type { GeoPoint } from './geo'
import type { AccountStatus } from './common'

export type UserRole = 'SYSTEM_ADMIN' | 'AGENCY_ADMIN' | 'COMMAND_STAFF' | 'FIELD_RESPONDER'

export type UserAccountStatus = AccountStatus

/**
 * A platform user.
 *
 * SYSTEM_ADMIN: Platform administrator, no agency affiliation. Can review and approve agency registrations.
 * AGENCY_ADMIN: Administrator for a specific agency. Created by System Admin during agency approval. Has agencyId.
 * COMMAND_STAFF: Command/operational staff for an agency. Created by Agency Admin. Has agencyId.
 * FIELD_RESPONDER: Field responder/operator for an agency. Created by Agency Admin. Has agencyId.
 */
export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  agencyId?: string  // Only populated for AGENCY_ADMIN, COMMAND_STAFF, FIELD_RESPONDER. Null for SYSTEM_ADMIN.
  accountStatus: UserAccountStatus
  createdAt: string
  createdByUserId?: string
  lastLoginAt?: string
  /** Field Responders only — their last known position, used to find the nearest responder to an incident. */
  currentLocation?: GeoPoint
}

/**
 * Lightweight projection of a User used by the application shell (topbar,
 * user menu). Kept separate from User so shell components don't need the
 * full entity — just consumes UserRole, the same union User uses.
 */
export interface AppUserSummary {
  name: string
  role: UserRole
  agencyName?: string
  avatarUrl?: string
}
