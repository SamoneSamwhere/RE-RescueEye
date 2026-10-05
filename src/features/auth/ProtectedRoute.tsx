import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { UserRole } from '../../types/user'
import { ROUTES } from '../../routes/paths'
import { LoadingState } from '../../components/ui'
import { useAuth } from './AuthContext'

interface ProtectedRouteProps {
  allowedRoles: UserRole[]
  children: ReactNode
}

/** Gate a route behind an authenticated session with one of the allowed roles. */
export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { session, status } = useAuth()

  if (status === 'idle') {
    return <LoadingState label="Checking session..." />
  }

  if (!session) {
    return <Navigate to={ROUTES.login} replace />
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to={ROUTES.unauthorized} replace />
  }

  return <>{children}</>
}
