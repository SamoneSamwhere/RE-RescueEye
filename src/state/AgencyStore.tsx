import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { mockAgencies } from '../data/mockAgencies'
import type { Agency } from '../types/agency'

interface AgencyStoreContextValue {
  agencies: Agency[]
  updateAgency: (agencyId: string, patch: Partial<Agency>) => void
}

const AgencyStoreContext = createContext<AgencyStoreContextValue | undefined>(undefined)

/** Single shared source of truth for Agency records, mounted at the app root. */
export function AgencyStoreProvider({ children }: { children: ReactNode }) {
  const [agencies, setAgencies] = useState<Agency[]>(mockAgencies)

  function updateAgency(agencyId: string, patch: Partial<Agency>) {
    setAgencies((prev) => prev.map((agency) => (agency.id === agencyId ? { ...agency, ...patch } : agency)))
  }

  return (
    <AgencyStoreContext.Provider value={{ agencies, updateAgency }}>{children}</AgencyStoreContext.Provider>
  )
}

export function useAgencyStore() {
  const ctx = useContext(AgencyStoreContext)
  if (!ctx) {
    throw new Error('useAgencyStore must be used within an AgencyStoreProvider')
  }
  return ctx
}
