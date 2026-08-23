import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  History,
  Siren,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { PageHeader } from '../components/layout'
import { Card, Badge } from '../components/ui'
import { Reveal } from '../components/landing/Reveal'
import { StatTile } from '../components/dashboard'
import { useAuth } from '../features/auth'
import { useAgencyAdminData } from '../features/agency-admin'
import { mockIncidents } from '../data/mockIncidents'
import { mockDrones } from '../data/mockDrones'
import { formatDateTime } from '../lib/formatDateTime'
import { USER_ROLE_LABEL } from '../lib/labels'
import { ROUTES } from '../routes/paths'

const ACTIONS = [
  {
    href: ROUTES.agencyAdminUserCreation,
    icon: UserPlus,
    title: 'Create Personnel',
    description: 'Add Command Staff or Field Responder accounts to your agency.',
  },
  {
    href: ROUTES.agencyAdminAccountStatus,
    icon: Users,
    title: 'Account Status Management',
    description: 'Activate or deactivate your agency’s user accounts.',
  },
  {
    href: ROUTES.agencyAdminIncidentHistory,
    icon: History,
    title: 'Incident History',
    description: 'Review incidents your agency’s responders have handled.',
  },
]

export function AgencyAdminDashboardPage() {
  const { session } = useAuth()
  const { agencyUsers } = useAgencyAdminData()

  if (!session) return null

  const agencyId = session.agencyId
  const agencyIncidents = mockIncidents.filter((incident) => incident.agencyId === agencyId)
  const agencyDrones = mockDrones.filter((drone) => drone.agencyId === agencyId)

  const activeCount = agencyUsers.filter((u) => u.accountStatus === 'ACTIVE').length

  const openIncidentCount = agencyIncidents.filter((incident) => incident.status !== 'CLOSED').length
  const dronesOnlineCount = agencyDrones.filter((drone) => drone.connectionStatus === 'CONNECTED').length

  const recentPersonnel = [...agencyUsers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  return (
    <>
      <PageHeader
        title="Agency Dashboard"
        description={`Administration for ${session.agencyName ?? 'your agency'}`}
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Agency Personnel" value={agencyUsers.length} icon={Users} tone="info" />
            <StatTile label="Active Accounts" value={activeCount} icon={UserCheck} tone="success" />
            <StatTile label="Open Incidents" value={openIncidentCount} icon={Siren} tone="warning" />
            <StatTile
              label="Drones Online"
              value={dronesOnlineCount}
              icon={Bot}
              tone={dronesOnlineCount === agencyDrones.length ? 'success' : 'warning'}
            />
            <StatTile label="Incidents Handled" value={agencyIncidents.length} icon={History} tone="info" />
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {ACTIONS.map((action) => (
              <Link key={action.href} to={action.href}>
                <Card className="flex h-full flex-col gap-3 px-4 py-4 transition-colors hover:bg-surface-secondary">
                  <span className="flex size-9 items-center justify-center rounded-md bg-accent-subtle text-accent">
                    <action.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{action.title}</p>
                    <p className="mt-1 text-xs text-foreground-secondary">{action.description}</p>
                  </div>
                  <p className="mt-auto flex items-center gap-1 text-xs font-medium text-accent">
                    Go
                    <ArrowRight className="size-3.5" />
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </Reveal>

        <Reveal delayMs={200}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
                Recently Added Personnel
              </p>
              <Link
                to={ROUTES.agencyAdminAccountStatus}
                className="flex items-center gap-1 text-xs font-medium text-accent"
              >
                View all ({agencyUsers.length})
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {recentPersonnel.length === 0 ? (
              <Card className="px-4 py-6 text-center text-sm text-foreground-muted">
                No personnel added yet. Create your first Command Staff or Field Responder account.
              </Card>
            ) : (
              recentPersonnel.map((user) => (
                <Card key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{user.name}</p>
                    <p className="text-xs text-foreground-muted">
                      {user.email} · Added {formatDateTime(user.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">{USER_ROLE_LABEL[user.role]}</Badge>
                    <Badge tone={user.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>
                      {user.accountStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Reveal>
      </div>
    </>
  )
}
