import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { UserRole } from '../../types/user'
import type { MockUser } from '../../data/mockUsers'
import { mockAgencies } from '../../data/mockAgencies'
import { useUserStore } from '../../state/UserStore'

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
  login: (email: string, password: string) => LoginResult
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const SESSION_STORAGE_KEY = 'rescueeye.session'

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
 * Mock authentication — session lives in localStorage, credentials are
 * checked against the in-memory mock user directory.
 *
 * This is a development-mode provider. The mock users in UserStore are
 * initialized from mockUsers.ts. All auth checks are against this in-memory list.
 *
 * For production, this would be replaced with Supabase Auth or similar.
 * The authentication flow would be:
 * 1. User submits email/password
 * 2. Hash password with SHA-256 (or bcrypt in prod)
 * 3. Query Supabase for user with matching email and passwordHash
 * 4. Check if user.active === true
 * 5. Store session in localStorage
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

  function login(email: string, password: string): LoginResult {
    const user = users.find(
      (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
    )

    if (!user || user.password !== password) {
      return { ok: false, error: 'Invalid email or password.' }
    }
    if (user.accountStatus !== 'ACTIVE') {
      return { ok: false, error: 'This account has been deactivated.' }
    }

    const nextSession = toSession(user)
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    setStatus('authenticated')
    return { ok: true }
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
