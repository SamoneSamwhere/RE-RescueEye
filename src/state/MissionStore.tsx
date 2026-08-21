import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { mockMissions } from '../data/mockMissions'
import type { Mission } from '../types/mission'

interface MissionStoreContextValue {
  missions: Mission[]
  addMission: (mission: Mission) => void
  updateMission: (missionId: string, patch: Partial<Mission>) => void
}

const MissionStoreContext = createContext<MissionStoreContextValue | undefined>(undefined)

/**
 * Single shared source of truth for Mission records, mounted once at the
 * app root above every role's routes. Command Staff and Field Responder
 * each have their own scoped data provider, but both must see the same
 * underlying missions — a Field Responder accepting/navigating/completing
 * a mission has to be visible to Command Staff (e.g. on the operational
 * map) without a backend, so both providers read/write through this store
 * instead of each forking their own local copy of mockMissions.
 */
export function MissionStoreProvider({ children }: { children: ReactNode }) {
  const [missions, setMissions] = useState<Mission[]>(mockMissions)

  function addMission(mission: Mission) {
    setMissions((prev) => [...prev, mission])
  }

  function updateMission(missionId: string, patch: Partial<Mission>) {
    setMissions((prev) => prev.map((mission) => (mission.id === missionId ? { ...mission, ...patch } : mission)))
  }

  return (
    <MissionStoreContext.Provider value={{ missions, addMission, updateMission }}>
      {children}
    </MissionStoreContext.Provider>
  )
}

export function useMissionStore() {
  const ctx = useContext(MissionStoreContext)
  if (!ctx) {
    throw new Error('useMissionStore must be used within a MissionStoreProvider')
  }
  return ctx
}
