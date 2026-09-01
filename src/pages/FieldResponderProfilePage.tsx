import { Mail, Phone, Building2, Clock, LogOut, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MobileShell } from '../data/components/layout'
import { Card, Badge, Button } from '../data/components/ui'
import { useAuth } from '../features/auth'
import { FIELD_RESPONDER_NAV_ITEMS } from '../features/field-responder'
import { useCurrentProfileUser } from '../hooks/useCurrentProfileUser'
import { formatDateTime } from '../lib/formatDateTime'
import { notificationsFor } from '../lib/notifications'
import { useNotificationStore } from '../state/NotificationStore'
import { ROUTES } from '../routes/paths'

function ProfileField({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-foreground-muted" />
      <div>
        <p className="text-xs uppercase tracking-wide text-foreground-muted">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  )
}

export function FieldResponderProfilePage() {
  const navigate = useNavigate()
  const { session, logout } = useAuth()
  const { notifications: allNotifications } = useNotificationStore()
  const { currentUser } = useCurrentProfileUser()

  const notifications = session ? notificationsFor(allNotifications, session.id) : []

  if (!session) return null

  const initials = session.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <MobileShell navItems={FIELD_RESPONDER_NAV_ITEMS} notifications={notifications}>
      <div className="flex flex-col gap-4 px-4 py-4">
        <Card className="flex flex-col items-center gap-3 px-6 py-6 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-accent-subtle text-lg font-semibold text-accent">
            {initials}
          </span>
          <div>
            <p className="text-base font-semibold text-foreground">{session.name}</p>
            <p className="text-sm text-foreground-secondary">Field Responder</p>
          </div>
          <Badge tone={currentUser?.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>
            {currentUser?.accountStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
          </Badge>
        </Card>

        <Card className="flex flex-col gap-4 px-4 py-4">
          <ProfileField icon={Building2} label="Agency" value={session.agencyName ?? 'Unassigned'} />
          <ProfileField icon={Mail} label="Email" value={session.email} />
          <ProfileField icon={Phone} label="Phone" value={currentUser?.phone ?? 'Not on file'} />
          {currentUser?.lastLoginAt ? (
            <ProfileField icon={Clock} label="Last Login" value={formatDateTime(currentUser.lastLoginAt)} />
          ) : null}
        </Card>

        <Button variant="secondary" className="w-full" onClick={() => navigate(ROUTES.fieldResponderSettings)}>
          <Settings className="size-4" />
          Edit Profile & Settings
        </Button>

        <Button variant="outline" className="w-full" onClick={logout}>
          <LogOut className="size-4" />
          Log Out
        </Button>
      </div>
    </MobileShell>
  )
}
