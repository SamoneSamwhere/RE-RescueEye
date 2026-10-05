import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MobileShell } from '../components/layout'
import { Button } from '../components/ui/Button'
import { useAuth } from '../features/auth'
import { useCurrentProfileUser } from '../hooks/useCurrentProfileUser'
import { ProfileEditForm, ChangePasswordForm } from '../components/profile'
import { FIELD_RESPONDER_NAV_ITEMS } from '../features/field-responder'
import { notificationsFor } from '../lib/notifications'
import { useNotificationStore } from '../state/NotificationStore'
import { ROUTES } from '../routes/paths'

export function FieldResponderSettingsPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { currentUser, isRealAccount } = useCurrentProfileUser()
  const { notifications: allNotifications } = useNotificationStore()

  const notifications = session ? notificationsFor(allNotifications, session.id) : []

  if (!session || !currentUser) return null

  const handleSuccess = () => {
    setTimeout(() => {
      navigate(ROUTES.fieldResponderProfile)
    }, 1500)
  }

  return (
    <MobileShell navItems={FIELD_RESPONDER_NAV_ITEMS} notifications={notifications}>
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-4 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(ROUTES.fieldResponderProfile)}
              className="p-0"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          </div>

          <div className="flex flex-col gap-4">
            <ProfileEditForm user={currentUser} isRealAccount={isRealAccount} onSuccess={handleSuccess} />
            <ChangePasswordForm user={currentUser} isRealAccount={isRealAccount} onSuccess={handleSuccess} />
          </div>
        </div>
      </div>
    </MobileShell>
  )
}
