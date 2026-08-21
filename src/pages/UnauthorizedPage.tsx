import { useNavigate } from 'react-router-dom'
import { UnauthorizedState, Button } from '../components/ui'
import { useAuth, ROLE_HOME_ROUTE } from '../features/auth'
import { ROUTES } from '../routes/paths'

export function UnauthorizedPage() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <UnauthorizedState description="Your account does not have access to this part of RescueEye." />
      <div className="flex items-center gap-2">
        {session ? (
          <>
            <Button variant="outline" onClick={logout}>
              Log out
            </Button>
            <Button variant="primary" onClick={() => navigate(ROLE_HOME_ROUTE[session.role])}>
              Go to my dashboard
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={() => navigate(ROUTES.login)}>
            Back to login
          </Button>
        )}
      </div>
    </div>
  )
}
