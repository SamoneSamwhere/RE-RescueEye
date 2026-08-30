import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Agency, AgencyAccountStatus } from '../../types/agency'
import { useAuth } from '../auth'
import { useAgencyDatabase } from '../../hooks/useAgencyDatabase'
import type { DbAgency } from '../../hooks/useAgencyDatabase'
import { supabase } from '../../lib/supabase'

interface SystemAdminDataContextValue {
  agencies: Agency[]
  isLoading: boolean
  refresh: () => Promise<void>
  approveAgency: (agencyId: string) => Promise<void>
  rejectAgency: (agencyId: string, reason: string) => Promise<void>
  requestResubmission: (agencyId: string, notes: string) => Promise<void>
  resubmitAgency: (agencyId: string) => Promise<void>
  setAgencyAccountStatus: (agencyId: string, status: AgencyAccountStatus) => Promise<void>
}

const SystemAdminDataContext = createContext<SystemAdminDataContextValue | undefined>(undefined)

interface CreatorInfo {
  firstName: string | null
  lastName: string | null
  position: string | null
  email: string
  phone: string | null
}

function mapDbAgencyToAgency(dbAgency: DbAgency, creator: CreatorInfo | undefined): Agency {
  return {
    id: String(dbAgency.id),
    name: dbAgency.name,
    agencyType: dbAgency.agencyType || '',
    address: dbAgency.address || '',
    website: dbAgency.website || undefined,
    contactEmail: dbAgency.contactEmail || '',
    contactPhone: dbAgency.contactPhone || undefined,
    agencyAdmin: {
      fullName: creator ? `${creator.firstName || ''} ${creator.lastName || ''}`.trim() : '',
      position: creator?.position || '',
      email: creator?.email || '',
      phone: creator?.phone || '',
    },
    documents: [],
    registrationStatus: dbAgency.registrationStatus,
    accountStatus: dbAgency.accountStatus || 'INACTIVE',
    registeredAt: dbAgency.createdAt,
    reviewedByUserId: dbAgency.validatedBy ? String(dbAgency.validatedBy) : undefined,
    reviewedAt: dbAgency.validatedAt || undefined,
    reviewNotes: dbAgency.reviewNotes || undefined,
  }
}

/**
 * Wraps the real Supabase `agency`/`user` tables with the System Admin
 * actions: reviewing a PENDING registration — approve, reject, or ask for
 * corrections — and, once APPROVED, toggling ongoing account status.
 */
export function SystemAdminDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const db = useAgencyDatabase()
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    const dbAgencies = await db.getAgencies()

    const creatorIds = Array.from(new Set(dbAgencies.map((a) => a.createdBy)))
    let creatorsById = new Map<number, CreatorInfo>()
    if (creatorIds.length > 0) {
      const { data: creators, error: creatorsError } = await supabase
        .from('user')
        .select('id, firstName, lastName, position, email, phone')
        .in('id', creatorIds)

      if (!creatorsError && creators) {
        creatorsById = new Map(creators.map((c) => [c.id, c]))
      }
    }

    setAgencies(dbAgencies.map((a) => mapDbAgencyToAgency(a, creatorsById.get(a.createdBy))))
    setIsLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Reviewer attribution (validatedBy) can't be set to a real user id yet — System Admin
  // login is still mock-only, and the database has no row representing this session's identity.
  async function approveAgency(agencyId: string) {
    if (!session) return
    const ok = await db.approveAgency(Number(agencyId), null)
    if (ok) await refresh()
  }

  async function rejectAgency(agencyId: string, reason: string) {
    if (!session) return
    const ok = await db.rejectAgency(Number(agencyId), null, reason)
    if (ok) await refresh()
  }

  async function requestResubmission(agencyId: string, notes: string) {
    if (!session) return
    const ok = await db.requestResubmission(Number(agencyId), null, notes)
    if (ok) await refresh()
  }

  async function resubmitAgency(agencyId: string) {
    const ok = await db.resubmitAgency(Number(agencyId))
    if (ok) await refresh()
  }

  async function setAgencyAccountStatus(agencyId: string, status: AgencyAccountStatus) {
    const ok = await db.setAgencyAccountStatus(Number(agencyId), status)
    if (ok) await refresh()
  }

  return (
    <SystemAdminDataContext.Provider
      value={{
        agencies,
        isLoading,
        refresh,
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
