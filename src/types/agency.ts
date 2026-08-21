import type { AccountStatus } from './common'

/** System Admin reviews a new agency's registration before it can operate. */
export type AgencyRegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** System Admin can activate/deactivate an already-approved agency. */
export type AgencyAccountStatus = AccountStatus

export interface Agency {
  id: string
  name: string
  contactEmail: string
  contactPhone?: string
  registrationStatus: AgencyRegistrationStatus
  accountStatus: AgencyAccountStatus
  registeredAt: string
  reviewedByUserId?: string
  reviewedAt?: string
}
