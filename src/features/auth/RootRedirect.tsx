import { Navigate } from 'react-router-dom'
import { LoadingState } from '../../data/components/ui'
import { LandingPage } from '../../pages/LandingPage'
import { useAuth } from './AuthContext'
import { ROLE_HOME_ROUTE } from './roleRoutes'

/** Shows the public landing page at "/", or sends signed-in users to their role home. */
export function RootRedirect() {
  const { session, status } = useAuth()

  if (status === 'idle') {
    return <LoadingState label="Loading RescueEye..." />
  }

  if (!session) {
    return <LandingPage />
  }

  return <Navigate to={ROLE_HOME_ROUTE[session.role]} replace />
}
