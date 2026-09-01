import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { UserRole } from '../../types/user'
import type { MockUser } from '../../data/mockUsers'
import { mockAgencies } from '../../data/mockAgencies'
import { useUserStore } from '../../state/UserStore'
import { supabase } from '../../lib/supabase'
import { hashPassword } from '../../hooks/useAgencyDatabase'

export interface AuthSession {
  id: string
  name: string
  email: string
  role: UserRole
  agencyId?: string
  agencyName?: string
}

type LoginResult = { ok: true } | { ok: false; error: string }

interface AuthContextValue {
  session: AuthSession | null
  status: 'idle' | 'authenticated' | 'unauthenticated'
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const SESSION_STORAGE_KEY = 'rescueeye.mockSession'

function toSession(user: MockUser): AuthSession {
  const agency = mockAgencies.find((candidate) => candidate.id === user.agencyId)
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    agencyId: user.agencyId,
    agencyName: agency?.name,
  }
}

/** Checks a real Supabase user (agency admin, staff, responder) — mock accounts never reach here. */
async function loginWithSupabase(email: string, password: string): Promise<LoginResult> {
  const { data: dbUser, error: dbError } = await supabase
    .from('user')
    .select('id, email, passwordHash, firstName, lastName, role, agencyId, active')
    .ilike('email', email.trim())
    .maybeSingle()

  if (dbError || !dbUser) {
    return { ok: false, error: 'Invalid email or password.' }
  }

  const passwordHash = await hashPassword(password)
  if (passwordHash !== dbUser.passwordHash) {
    return { ok: false, error: 'Invalid email or password.' }
  }
  if (!dbUser.active) {
    return { ok: false, error: 'This account has been deactivated.' }
  }

  let agencyName: string | undefined
  if (dbUser.agencyId) {
    const { data: agencyData } = await supabase.from('agency').select('name').eq('id', dbUser.agencyId).single()
    agencyName = agencyData?.name
  }

  const nextSession: AuthSession = {
    id: String(dbUser.id),
    name: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim(),
    email: dbUser.email,
    role: dbUser.role as UserRole,
    agencyId: dbUser.agencyId ? String(dbUser.agencyId) : undefined,
    agencyName,
  }
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
  return { ok: true }
}

const VALID_ROLES: UserRole[] = ['SYSTEM_ADMIN', 'AGENCY_ADMIN', 'COMMAND_STAFF', 'FIELD_RESPONDER']

/** Guards against trusting a corrupted or stale-schema value pulled from localStorage. */
function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.role === 'string' &&
    VALID_ROLES.includes(candidate.role as UserRole)
  )
}

/**
 * Authentication checks the in-memory mock user directory first (the
 * built-in demo accounts), then falls back to the real Supabase `user`
 * table for accounts created through the real agency registration flow.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { users } = useUserStore()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [status, setStatus] = useState<'idle' | 'authenticated' | 'unauthenticated'>('idle')

  useEffect(() => {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (isValidSession(parsed)) {
          setSession(parsed)
          setStatus('authenticated')
          return
        }
      } catch {
        // fall through to clearing the corrupted value below
      }
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    }
    setStatus('unauthenticated')
  }, [])

  async function login(email: string, password: string): Promise<LoginResult> {
    const mockUser = users.find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase())

    if (mockUser) {
      if (mockUser.password !== password) {
        return { ok: false, error: 'Invalid email or password.' }
      }
      if (mockUser.accountStatus !== 'ACTIVE') {
        return { ok: false, error: 'This account has been deactivated.' }
      }
      const nextSession = toSession(mockUser)
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
      setSession(nextSession)
      setStatus('authenticated')
      return { ok: true }
    }

    const result = await loginWithSupabase(email, password)
    if (result.ok) {
      const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
      if (raw) {
        setSession(JSON.parse(raw) as AuthSession)
        setStatus('authenticated')
      }
    }
    return result
  }

  function logout() {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
    setSession(null)
    setStatus('unauthenticated')
  }

  return (
    <AuthContext.Provider value={{ session, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
