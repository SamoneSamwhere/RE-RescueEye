import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { now } from '../../lib/now'
import type { Agency, AgencyAccountStatus } from '../../types/agency'
import { useAuth } from '../auth'
import { useAgencyStore } from '../../state/AgencyStore'

interface SystemAdminDataContextValue {
  agencies: Agency[]
  approveAgency: (agencyId: string) => void
  rejectAgency: (agencyId: string) => void
  resubmitAgency: (agencyId: string) => void
  setAgencyAccountStatus: (agencyId: string, status: AgencyAccountStatus) => void
}

const SystemAdminDataContext = createContext<SystemAdminDataContextValue | undefined>(undefined)

/**
 * Wraps the shared Agency store with the System Admin actions: reviewing a
 * PENDING registration (approve/reject) and, once APPROVED, toggling
 * ongoing account status. A REJECTED agency is never a dead end — resubmit
 * puts it back to PENDING for another review pass, and account status
 * changes never delete the agency record.
 */
export function SystemAdminDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { agencies, updateAgency } = useAgencyStore()

  /** Only PENDING agencies can be approved. */
  function approveAgency(agencyId: string) {
    if (agencies.find((a) => a.id === agencyId)?.registrationStatus !== 'PENDING') return
    updateAgency(agencyId, {
      registrationStatus: 'APPROVED',
      accountStatus: 'ACTIVE',
      reviewedByUserId: session?.id,
      reviewedAt: now().toISOString(),
    })
  }

  /** Only PENDING agencies can be rejected. */
  function rejectAgency(agencyId: string) {
    if (agencies.find((a) => a.id === agencyId)?.registrationStatus !== 'PENDING') return
    updateAgency(agencyId, {
      registrationStatus: 'REJECTED',
      accountStatus: 'INACTIVE',
      reviewedByUserId: session?.id,
      reviewedAt: now().toISOString(),
    })
  }

  /** REJECTED -> PENDING: represents the agency correcting and resubmitting its registration. */
  function resubmitAgency(agencyId: string) {
    if (agencies.find((a) => a.id === agencyId)?.registrationStatus !== 'REJECTED') return
    updateAgency(agencyId, {
      registrationStatus: 'PENDING',
      reviewedByUserId: undefined,
      reviewedAt: undefined,
    })
  }

  function setAgencyAccountStatus(agencyId: string, status: AgencyAccountStatus) {
    updateAgency(agencyId, { accountStatus: status })
  }

  return (
    <SystemAdminDataContext.Provider
      value={{ agencies, approveAgency, rejectAgency, resubmitAgency, setAgencyAccountStatus }}
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
