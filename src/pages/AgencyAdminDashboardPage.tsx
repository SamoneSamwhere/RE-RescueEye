import { Link } from 'react-router-dom'
import { ArrowRight, History, Users, UsersRound } from 'lucide-react'
import { PageHeader } from '../data/components/layout'
import { Card, Badge } from '../data/components/ui'
import { Reveal } from '../data/components/landing/Reveal'
import { useAuth } from '../features/auth'
import { useAgencyAdminData } from '../features/agency-admin'
import { formatDateTime } from '../lib/formatDateTime'
import { USER_ROLE_LABEL } from '../lib/labels'
import { ROUTES } from '../routes/paths'

const ACTIONS = [
  {
    href: ROUTES.agencyAdminAccountStatus,
    icon: Users,
    title: 'Manage Personnel / Staff',
    description: 'Add staff, and activate or deactivate your organization’s accounts.',
  },
  {
    href: ROUTES.agencyAdminTeams,
    icon: UsersRound,
    title: 'Teams',
    description: 'Group personnel into response teams and choose each team’s leader.',
  },
  {
    href: ROUTES.agencyAdminIncidentHistory,
    icon: History,
    title: 'Incident History',
    description: 'Review incidents your organization’s responders have handled.',
  },
]

/**
 * The Agency Admin's job is people — who is in the organization and which
 * team they are on. The stat tiles that used to lead this page (personnel
 * count, active accounts, open incidents, drones online) were analytics for a
 * role that acts on none of them, so the page is now just the admin's tasks.
 */
export function AgencyAdminDashboardPage() {
  const { session } = useAuth()
  const { agencyUsers } = useAgencyAdminData()

  if (!session) return null

  const recentPersonnel = [...agencyUsers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  return (
    <>
      <PageHeader title="Dashboard" description={`Administration for ${session.agencyName ?? 'your organization'}`} />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
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

        <Reveal delayMs={100}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground-secondary">
                Recently Added Staff
              </p>
              <Link to={ROUTES.agencyAdminAccountStatus} className="flex items-center gap-1 text-xs font-medium text-accent">
                Manage personnel
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
            {recentPersonnel.length === 0 ? (
              <Card className="px-4 py-6 text-center text-sm text-foreground-muted">
                No staff added yet. Use Add Staff on the Manage Personnel page to create your first account.
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
