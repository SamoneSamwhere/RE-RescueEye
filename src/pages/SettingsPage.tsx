import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../features/auth'
import { useUserStore } from '../state/UserStore'
import { ProfileEditForm, ChangePasswordForm } from '../data/components/profile'
import { Button } from '../data/components/ui/Button'

export function SettingsPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { users } = useUserStore()

  const currentUser = session ? users.find((u) => u.id === session.id) : undefined

  if (!session || !currentUser) return null

  const handleSuccess = () => {
    setTimeout(() => {
      navigate(-1)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col gap-6 px-4 py-6 md:max-w-2xl md:px-0 md:mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-0">
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        </div>

        <div className="flex flex-col gap-4">
          <ProfileEditForm user={currentUser} onSuccess={handleSuccess} />
          <ChangePasswordForm user={currentUser} onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  )
}
