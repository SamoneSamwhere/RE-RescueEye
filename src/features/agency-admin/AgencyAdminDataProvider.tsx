import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { MockUser } from '../../data/mockUsers'
import type { UserAccountStatus, UserRole } from '../../types/user'
import type { IncidentPriority } from '../../types/incident'
import type { MissionStatus } from '../../types/mission'
import { useAuth } from '../auth'
import { useMissionStore } from '../../state/MissionStore'
import { useIncidentStore } from '../../state/IncidentStore'
import { useStaffDatabase } from '../../hooks/useStaffDatabase'
import type { DbStaffUser } from '../../hooks/useStaffDatabase'
import { buildResponseTeams } from '../../lib/responseTeams'
import type { ResponseTeam } from '../../lib/responseTeams'

export type CreatableUserRole = Extract<UserRole, 'COMMAND_STAFF' | 'FIELD_RESPONDER'>

export interface CreateUserInput {
  firstName: string
  lastName: string
  email: string
  phone?: string
  password: string
  role: CreatableUserRole
}

export type CreateUserResult =
  | { ok: true; userId: string }
  | { ok: false; error: string; field?: 'email' }

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
  /**
   * Response teams Command Staff formed by alerting this organization's
   * responders for an incident. Read-only here: the Agency Admin monitors
   * teams but never forms or changes them.
   */
  responseTeams: ResponseTeam[]
  /** Priority of each incident a response team is working, by incident id. */
  incidentPriorityById: Map<string, IncidentPriority>
  incidentHistory: IncidentHistoryItem[]
  isLoading: boolean
  createUser: (input: CreateUserInput) => Promise<CreateUserResult>
  setUserStatus: (userId: string, status: UserAccountStatus) => Promise<void>
}

const AgencyAdminDataContext = createContext<AgencyAdminDataContextValue | undefined>(undefined)

function mapDbStaffToMockUser(dbUser: DbStaffUser): MockUser {
  return {
    id: String(dbUser.id),
    name: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim(),
    email: dbUser.email,
    phone: dbUser.phone || undefined,
    role: dbUser.role,
    agencyId: String(dbUser.agencyId),
    accountStatus: dbUser.active ? 'ACTIVE' : 'INACTIVE',
    createdAt: dbUser.createdAt,
    // Real accounts authenticate against Supabase's passwordHash, not this field.
    password: '',
  }
}

/**
 * Scopes the real Supabase `user` table down to this agency's Command
 * Staff / Field Responder users, and exposes the Agency Admin actions
 * (create user, set account status). Agency Admins never manage other
 * Agency Admins — those are created by System Admin — so agencyUsers is
 * deliberately restricted to the two creatable roles.
 */
export function AgencyAdminDataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const { getAgencyStaff, createStaffUser, setStaffActive } = useStaffDatabase()
  const { missions } = useMissionStore()
  const { incidents } = useIncidentStore()

  const agencyId = session?.agencyId
  const [agencyUsers, setAgencyUsers] = useState<MockUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const dbAgencyId = Number(agencyId)
    // Demo logins carry ids like "agency-1": there is no database organization
    // behind them, so there is no personnel to load.
    if (!agencyId || !Number.isInteger(dbAgencyId)) {
      setAgencyUsers([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const staff = await getAgencyStaff(dbAgencyId)
    setAgencyUsers(staff.map(mapDbStaffToMockUser))
    setIsLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId])

  useEffect(() => {
    refresh()
  }, [refresh])

  /** Missions belonging to this organization's Field Responders. */
  const agencyMissions = useMemo(() => {
    const responderIds = new Set(agencyUsers.filter((u) => u.role === 'FIELD_RESPONDER').map((u) => u.id))
    return missions.filter((mission) => responderIds.has(mission.responderUserId))
  }, [missions, agencyUsers])

  const responseTeams = useMemo(() => buildResponseTeams(agencyMissions), [agencyMissions])

  const incidentPriorityById = useMemo(
    () => new Map(incidents.map((incident) => [incident.id, incident.priority])),
    [incidents],
  )

  const incidentHistory = useMemo<IncidentHistoryItem[]>(() => {
    return agencyMissions
      .map((mission) => {
        const responder = agencyUsers.find((u) => u.id === mission.responderUserId)
        const incident = incidents.find((i) => i.id === mission.incidentId)
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
  }, [agencyMissions, agencyUsers, incidents])

  async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
    if (!session || !agencyId) return { ok: false, error: 'Your session has ended. Sign in again and retry.' }
    // Demo logins carry agency ids like "agency-1", which Number() turns into
    // NaN — the insert then failed with a database type error nobody could act on.
    const dbAgencyId = Number(agencyId)
    if (session.id.startsWith('usr-') || !Number.isInteger(dbAgencyId)) {
      return { ok: false, error: 'Creating users requires a real agency account — demo accounts cannot add personnel.' }
    }

    const result = await createStaffUser({
      agencyId: dbAgencyId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      password: input.password,
      role: input.role,
    })

    if (!result.ok) return result
    // The user exists at this point. A failed list refresh must not turn that
    // into a reported failure — the admin would retry and hit "already exists".
    try {
      await refresh()
    } catch (err) {
      console.error('Personnel list refresh failed after creating a user:', err)
    }
    return { ok: true, userId: String(result.userId) }
  }

  async function setUserStatus(userId: string, status: UserAccountStatus) {
    await setStaffActive(Number(userId), status === 'ACTIVE')
    await refresh()
  }

  return (
    <AgencyAdminDataContext.Provider
      value={{
        agencyUsers,
        responseTeams,
        incidentPriorityById,
        incidentHistory,
        isLoading,
        createUser,
        setUserStatus,
      }}
    >
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
