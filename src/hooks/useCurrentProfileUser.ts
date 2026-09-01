import { useCallback, useEffect, useState } from 'react'
import type { MockUser } from '../data/mockUsers'
import { useAuth } from '../features/auth'
import { useUserStore } from '../state/UserStore'
import { useProfileDatabase } from './useProfileDatabase'

/**
 * Resolves the logged-in user's profile record from whichever store actually
 * has it: the mock UserStore for the built-in demo accounts (ids prefixed
 * "usr-"), or the real Supabase `user` table for anyone who registered/was
 * created through the real agency flow. System Admin is always mock — the
 * database has no SYSTEM_ADMIN role at all.
 */
export function useCurrentProfileUser() {
  const { session } = useAuth()
  const { users } = useUserStore()
  const { getUserById } = useProfileDatabase()

  const isRealAccount = !!session && !session.id.startsWith('usr-')
  const mockUser = session ? users.find((u) => u.id === session.id) : undefined

  const [dbUser, setDbUser] = useState<MockUser | null>(null)
  const [isLoading, setIsLoading] = useState(isRealAccount)

  const refresh = useCallback(async () => {
    if (!session || !isRealAccount) return
    setIsLoading(true)
    const data = await getUserById(Number(session.id))
    if (data) {
      setDbUser({
        id: String(data.id),
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        email: data.email,
        phone: data.phone || undefined,
        role: data.role,
        agencyId: data.agencyId ? String(data.agencyId) : undefined,
        accountStatus: data.active ? 'ACTIVE' : 'INACTIVE',
        createdAt: data.createdAt,
        password: '',
      })
    }
    setIsLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, isRealAccount])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    currentUser: isRealAccount ? dbUser : mockUser,
    isRealAccount,
    isLoading: isRealAccount ? isLoading : false,
    refresh,
  }
}
