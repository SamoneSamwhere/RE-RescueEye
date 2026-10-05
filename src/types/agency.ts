import type { AccountStatus } from './common'
import type { DocumentId } from '../components/landing/registration/types'

/** System Admin reviews a new agency's registration before it can operate. */
export type AgencyRegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMISSION_REQUIRED'

/** System Admin can activate/deactivate an already-approved agency. */
export type AgencyAccountStatus = AccountStatus

export interface AgencyAdminInfo {
  fullName: string
  position: string
  email: string
  phone: string
}

export type AgencyDocumentFileType = 'image' | 'pdf'

/** A verification document submitted with the agency's registration. */
export interface AgencyDocument {
  id: DocumentId
  label: string
  required: boolean
  fileName: string
  fileType: AgencyDocumentFileType
  /** Object/data URL the document can be previewed or downloaded from. */
  url: string
  uploadedAt: string
}

export interface Agency {
  id: string
  name: string
  agencyType: string
  address: string
  website?: string
  contactEmail: string
  contactPhone?: string
  agencyAdmin: AgencyAdminInfo
  documents: AgencyDocument[]
  registrationStatus: AgencyRegistrationStatus
  accountStatus: AgencyAccountStatus
  registeredAt: string
  reviewedByUserId?: string
  reviewedAt?: string
  /** Rejection reason, or corrections requested for resubmission. Shown to the agency admin. */
  reviewNotes?: string
}
