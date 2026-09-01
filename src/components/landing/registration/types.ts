export interface AgencyInfoValues {
  agencyName: string
  agencyType: string
  agencyAddress: string
  agencyPhone: string
  agencyEmail: string
  agencyWebsite: string
}

export interface AdminInfoValues {
  firstName: string
  lastName: string
  position: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

export type DocumentId = 'registration' | 'adminId' | 'proofOfAddress' | 'accreditation'

export type DocumentFiles = Record<DocumentId, File | null>
export type DocumentErrors = Record<DocumentId, string | null>

export const AGENCY_TYPES = [
  'Fire & Rescue',
  'Search & Rescue (SAR)',
  'Emergency Medical Services (EMS)',
  'Law Enforcement',
  'Disaster Relief / NGO',
  'Government / Municipal Emergency Management',
  'Other',
] as const

export const REQUIRED_DOCUMENTS: Array<{
  id: DocumentId
  label: string
  hint: string
  required: boolean
}> = [
  {
    id: 'registration',
    label: 'Certificate of Registration / Incorporation',
    hint: "Proves your agency is a legally registered organization.",
    required: true,
  },
  {
    id: 'adminId',
    label: "Agency Admin's Government-Issued ID",
    hint: 'A valid ID for the person registering this agency.',
    required: true,
  },
  {
    id: 'proofOfAddress',
    label: 'Proof of Agency Address',
    hint: 'Utility bill, lease agreement, or official correspondence.',
    required: true,
  },
  {
    id: 'accreditation',
    label: 'Accreditation or Operating License',
    hint: 'If your agency holds a relevant license or accreditation.',
    required: false,
  },
]
