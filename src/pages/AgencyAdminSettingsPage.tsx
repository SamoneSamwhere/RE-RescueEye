import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/layout'
import { Button } from '../components/ui/Button'
import { useAuth } from '../features/auth'
import { useCurrentProfileUser } from '../hooks/useCurrentProfileUser'
import { ProfileEditForm, ChangePasswordForm } from '../components/profile'
import { ROUTES } from '../routes/paths'

export function AgencyAdminSettingsPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { currentUser, isRealAccount } = useCurrentProfileUser()

  if (!session || !currentUser) return null

  const handleSuccess = () => {
    setTimeout(() => {
      navigate(ROUTES.agencyAdmin)
    }, 1500)
  }

  return (
    <>
      <PageHeader title="Settings" description="Manage your account and security" />

      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-4 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0">
              <ArrowLeft className="size-4" />
            </Button>
          </div>
          <div className="flex flex-col gap-4">
            <ProfileEditForm user={currentUser} isRealAccount={isRealAccount} onSuccess={handleSuccess} />
            <ChangePasswordForm user={currentUser} isRealAccount={isRealAccount} onSuccess={handleSuccess} />
          </div>
        </div>
      </div>
    </>
  )
}
