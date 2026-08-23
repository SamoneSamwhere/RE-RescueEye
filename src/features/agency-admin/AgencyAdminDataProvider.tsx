import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { mockIncidents } from '../../data/mockIncidents'
import type { MockUser } from '../../data/mockUsers'
import { now } from '../../lib/now'
import { generateId } from '../../lib/id'
import type { UserAccountStatus, UserRole } from '../../types/user'
import type { IncidentPriority } from '../../types/incident'
import type { MissionStatus } from '../../types/mission'
import { useAuth } from '../auth'
import { useMissionStore } from '../../state/MissionStore'
import { useUserStore } from '../../state/UserStore'

export type CreatableUserRole = Extract<UserRole, 'COMMAND_STAFF' | 'FIELD_RESPONDER'>

export interface CreateUserInput {
  name: string
  email: string
  phone?: string
  password: string
  role: CreatableUserRole
}

export type CreateUserResult = { ok: true; userId: string } | { ok: false; error: string }

/**
 * One agency response record — a Field Responder's dispatch to a verified
 * incident. Built from the shared Mission store, but named/shaped around
 * "incident response" since Agency Admins think in incidents, not the
 * internal dispatch-record ("mission") terminology Command Staff/Field
 * Responder screens use.
 */
export interface IncidentHistoryItem {
  id: string
  responderName: string
  incidentPriority?: IncidentPriority
  status: MissionStatus
  dispatchedAt: string
  completedAt?: string
}

interface AgencyAdminDataContextValue {
  agencyUsers: MockUser[]
  incidentHistory: IncidentHistoryItem[]
  createUser: (input: CreateUserInput) => CreateUserResult
  setUserStatus: (userId: string, status: UserAccountStatus) => void
}

const AgencyAdminDataContext = createContext<AgencyAdminDataContextValue | undefined>(undefined)

/**
 * Scopes the shared user directory and mission store down to this agency's
 * Command Staff / Field Responder users, and exposes the Agency Admin
 * actions (create user, set account status). Agency Admins never manage
 * other Agency Admins — those are created by System Admin — so agencyUsers
 * is deliberately restricted to the two creatable roles.
 */
export function AgencyAdminDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { users, addUser, updateUser } = useUserStore()
  const { missions } = useMissionStore()

  const agencyId = session?.agencyId

  const agencyUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.agencyId === agencyId && (user.role === 'COMMAND_STAFF' || user.role === 'FIELD_RESPONDER'),
      ),
    [users, agencyId],
  )

  const incidentHistory = useMemo<IncidentHistoryItem[]>(() => {
    const responderIds = new Set(agencyUsers.filter((u) => u.role === 'FIELD_RESPONDER').map((u) => u.id))
    return missions
      .filter((mission) => responderIds.has(mission.responderUserId))
      .map((mission) => {
        const responder = agencyUsers.find((u) => u.id === mission.responderUserId)
        const incident = mockIncidents.find((i) => i.id === mission.incidentId)
        return {
          id: mission.id,
          responderName: responder?.name ?? 'Unknown responder',
          incidentPriority: incident?.priority,
          status: mission.status,
          dispatchedAt: mission.dispatchedAt,
          completedAt: mission.completedAt,
        }
      })
      .sort((a, b) => b.dispatchedAt.localeCompare(a.dispatchedAt))
  }, [missions, agencyUsers])

  function createUser(input: CreateUserInput): CreateUserResult {
    if (!session || !agencyId) return { ok: false, error: 'No active session.' }

    const email = input.email.trim().toLowerCase()
    const duplicate = users.some((user) => user.email.toLowerCase() === email)
    if (duplicate) {
      return { ok: false, error: 'A user with this email address already exists.' }
    }

    const newUser: MockUser = {
      id: generateId('usr'),
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() || undefined,
      password: input.password,
      role: input.role,
      agencyId,
      accountStatus: 'ACTIVE',
      createdAt: now().toISOString(),
      createdByUserId: session.id,
    }
    addUser(newUser)
    return { ok: true, userId: newUser.id }
  }

  function setUserStatus(userId: string, status: UserAccountStatus) {
    updateUser(userId, { accountStatus: status })
  }

  return (
    <AgencyAdminDataContext.Provider value={{ agencyUsers, incidentHistory, createUser, setUserStatus }}>
      {children}
    </AgencyAdminDataContext.Provider>
  )
}

export function useAgencyAdminData() {
  const ctx = useContext(AgencyAdminDataContext)
  if (!ctx) {
    throw new Error('useAgencyAdminData must be used within an AgencyAdminDataProvider')
  }
  return ctx
}
