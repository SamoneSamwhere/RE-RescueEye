import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { now } from '../../lib/now'
import type { Agency, AgencyAccountStatus } from '../../types/agency'
import { useAuth } from '../auth'
import { useAgencyStore } from '../../state/AgencyStore'

interface SystemAdminDataContextValue {
  agencies: Agency[]
  approveAgency: (agencyId: string) => void
  rejectAgency: (agencyId: string, reason: string) => void
  requestResubmission: (agencyId: string, notes: string) => void
  resubmitAgency: (agencyId: string) => void
  setAgencyAccountStatus: (agencyId: string, status: AgencyAccountStatus) => void
}

const SystemAdminDataContext = createContext<SystemAdminDataContextValue | undefined>(undefined)

/**
 * Wraps the shared Agency store with the System Admin actions: reviewing a
 * PENDING (or RESUBMISSION_REQUIRED) registration — approve, reject, or ask
 * for corrections — and, once APPROVED, toggling ongoing account status. A
 * REJECTED agency is never a dead end — resubmit puts it back to PENDING for
 * another review pass, and account status changes never delete the agency
 * record.
 */
export function SystemAdminDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { agencies, updateAgency } = useAgencyStore()

  const REVIEWABLE = new Set(['PENDING', 'RESUBMISSION_REQUIRED'])

  /** Only registrations still awaiting a decision can be approved. */
  function approveAgency(agencyId: string) {
    if (!REVIEWABLE.has(agencies.find((a) => a.id === agencyId)?.registrationStatus ?? '')) return
    updateAgency(agencyId, {
      registrationStatus: 'APPROVED',
      accountStatus: 'ACTIVE',
      reviewedByUserId: session?.id,
      reviewedAt: now().toISOString(),
      reviewNotes: undefined,
    })
  }

  /** Only registrations still awaiting a decision can be rejected. Requires a reason the agency admin will see. */
  function rejectAgency(agencyId: string, reason: string) {
    if (!REVIEWABLE.has(agencies.find((a) => a.id === agencyId)?.registrationStatus ?? '')) return
    updateAgency(agencyId, {
      registrationStatus: 'REJECTED',
      accountStatus: 'INACTIVE',
      reviewedByUserId: session?.id,
      reviewedAt: now().toISOString(),
      reviewNotes: reason,
    })
  }

  /** Asks the agency to correct specific items instead of an outright rejection. */
  function requestResubmission(agencyId: string, notes: string) {
    if (!REVIEWABLE.has(agencies.find((a) => a.id === agencyId)?.registrationStatus ?? '')) return
    updateAgency(agencyId, {
      registrationStatus: 'RESUBMISSION_REQUIRED',
      accountStatus: 'INACTIVE',
      reviewedByUserId: session?.id,
      reviewedAt: now().toISOString(),
      reviewNotes: notes,
    })
  }

  /** REJECTED -> PENDING: reopens the registration for another review pass. */
  function resubmitAgency(agencyId: string) {
    if (agencies.find((a) => a.id === agencyId)?.registrationStatus !== 'REJECTED') return
    updateAgency(agencyId, {
      registrationStatus: 'PENDING',
      reviewedByUserId: undefined,
      reviewedAt: undefined,
      reviewNotes: undefined,
    })
  }

  function setAgencyAccountStatus(agencyId: string, status: AgencyAccountStatus) {
    updateAgency(agencyId, { accountStatus: status })
  }

  return (
    <SystemAdminDataContext.Provider
      value={{
        agencies,
        approveAgency,
        rejectAgency,
        requestResubmission,
        resubmitAgency,
        setAgencyAccountStatus,
      }}
    >
      {children}
    </SystemAdminDataContext.Provider>
  )
}

export function useSystemAdminData() {
  const ctx = useContext(SystemAdminDataContext)
  if (!ctx) {
    throw new Error('useSystemAdminData must be used within a SystemAdminDataProvider')
  }
  return ctx
}
