import type { GeoPoint } from './geo'
import type { AccountStatus } from './common'

export type UserRole = 'SYSTEM_ADMIN' | 'AGENCY_ADMIN' | 'COMMAND_STAFF' | 'FIELD_RESPONDER'

export type UserAccountStatus = AccountStatus

/**
 * A platform user. System Admins have no agency; every other role belongs
 * to exactly one agency and is created by that agency's Agency Admin
 * (Command Staff / Field Responder) or by System Admin (Agency Admin, via
 * agency approval).
 */
export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  agencyId?: string
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
