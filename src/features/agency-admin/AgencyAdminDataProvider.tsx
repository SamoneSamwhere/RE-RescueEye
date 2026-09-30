import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { mockIncidents } from '../../data/mockIncidents'
import type { MockUser } from '../../data/mockUsers'
import type { UserAccountStatus, UserRole } from '../../types/user'
import type { IncidentPriority } from '../../types/incident'
import type { MissionStatus } from '../../types/mission'
import { useAuth } from '../auth'
import { useMissionStore } from '../../state/MissionStore'
import { useStaffDatabase } from '../../hooks/useStaffDatabase'
import type { DbStaffUser } from '../../hooks/useStaffDatabase'
import { useTeamDatabase } from '../../hooks/useTeamDatabase'

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

/** A response team. Only the Agency Admin creates teams and changes who is on them. */
export interface Team {
  id: string
  name: string
  leaderUserId?: string
}

/** Every team action resolves to an error message to show, or null on success. */
type TeamAction<A extends unknown[]> = (...args: A) => Promise<string | null>

interface AgencyAdminDataContextValue {
  agencyUsers: MockUser[]
  teams: Team[]
  /** False until migration 03_teams.sql has been run; teamsError then says so. */
  teamsAvailable: boolean
  teamsError: string | null
  createTeam: TeamAction<[name: string]>
  deleteTeam: TeamAction<[teamId: string]>
  setTeamLeader: TeamAction<[teamId: string, userId: string | null]>
  setUserTeam: TeamAction<[userId: string, teamId: string | null]>
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
    teamId: dbUser.teamId != null ? String(dbUser.teamId) : undefined,
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
  const { getAgencyStaff, createStaffUser, setStaffActive, setStaffTeam } = useStaffDatabase()
  const teamDb = useTeamDatabase()
  const { missions } = useMissionStore()

  const agencyId = session?.agencyId
  const [agencyUsers, setAgencyUsers] = useState<MockUser[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsAvailable, setTeamsAvailable] = useState(false)
  const [teamsError, setTeamsError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!agencyId) {
      setAgencyUsers([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const dbAgencyId = Number(agencyId)
    // Demo logins carry ids like "agency-1": there is no database organization
    // behind them, so say so instead of surfacing the query's type error.
    if (!Number.isInteger(dbAgencyId)) {
      setAgencyUsers([])
      setTeams([])
      setTeamsAvailable(false)
      setTeamsError('Teams require a real organization account — demo accounts have no personnel or teams to manage.')
      setIsLoading(false)
      return
    }
    const [staff, teamRows] = await Promise.all([getAgencyStaff(dbAgencyId), teamDb.getTeams(dbAgencyId)])
    setAgencyUsers(staff.map(mapDbStaffToMockUser))
    setTeamsAvailable(teamRows.available)
    setTeamsError(teamRows.available ? null : teamRows.error)
    setTeams(
      teamRows.teams.map((t) => ({
        id: String(t.id),
        name: t.name,
        leaderUserId: t.leaderUserId != null ? String(t.leaderUserId) : undefined,
      })),
    )
    setIsLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId])

  useEffect(() => {
    refresh()
  }, [refresh])

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

  /** Runs a team write, then reloads so every screen shows the same roster. */
  async function withRefresh(write: () => Promise<string | null>): Promise<string | null> {
    if (!Number.isInteger(Number(agencyId))) return 'Teams require a real organization account — demo accounts cannot manage teams.'
    const error = await write()
    await refresh()
    return error
  }

  const createTeam: AgencyAdminDataContextValue['createTeam'] = (name) =>
    withRefresh(() => teamDb.createTeam(Number(agencyId), name))
  const deleteTeam: AgencyAdminDataContextValue['deleteTeam'] = (teamId) =>
    withRefresh(() => teamDb.deleteTeam(Number(teamId)))
  const setTeamLeader: AgencyAdminDataContextValue['setTeamLeader'] = (teamId, userId) =>
    withRefresh(() => teamDb.setTeamLeader(Number(teamId), userId ? Number(userId) : null))
  const setUserTeam: AgencyAdminDataContextValue['setUserTeam'] = (userId, teamId) =>
    withRefresh(async () => {
      // A leader moved off their team stops leading it; otherwise the team
      // would name a leader who is no longer a member.
      const leading = teams.find((t) => t.leaderUserId === userId && t.id !== teamId)
      if (leading) {
        const err = await teamDb.setTeamLeader(Number(leading.id), null)
        if (err) return err
      }
      return setStaffTeam(Number(userId), teamId ? Number(teamId) : null)
    })

  return (
    <AgencyAdminDataContext.Provider
      value={{
        agencyUsers,
        teams,
        teamsAvailable,
        teamsError,
        createTeam,
        deleteTeam,
        setTeamLeader,
        setUserTeam,
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
