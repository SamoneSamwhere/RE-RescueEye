import { Link } from 'react-router-dom'
import { Users, UserCheck, UserX, UserPlus, History, ArrowRight } from 'lucide-react'
import { PageHeader } from '../components/layout'
import { Card } from '../components/ui'
import { Reveal } from '../components/landing/Reveal'
import { StatTile } from '../components/dashboard'
import { useAuth } from '../features/auth'
import { useAgencyAdminData } from '../features/agency-admin'
import { ROUTES } from '../routes/paths'

const ACTIONS = [
  {
    href: ROUTES.agencyAdminUserCreation,
    icon: UserPlus,
    title: 'User Creation',
    description: 'Create Command Staff or Field Responder accounts for your agency.',
  },
  {
    href: ROUTES.agencyAdminAccountStatus,
    icon: Users,
    title: 'Account Status Management',
    description: 'Activate or deactivate your agency’s user accounts.',
  },
  {
    href: ROUTES.agencyAdminMissionHistory,
    icon: History,
    title: 'Mission History',
    description: 'Review missions previously handled by your agency’s responders.',
  },
]

export function AgencyAdminDashboardPage() {
  const { session } = useAuth()
  const { agencyUsers, missionHistory } = useAgencyAdminData()

  if (!session) return null

  const activeCount = agencyUsers.filter((u) => u.accountStatus === 'ACTIVE').length
  const inactiveCount = agencyUsers.length - activeCount

  return (
    <>
      <PageHeader
        title="Agency Dashboard"
        description={`Administration for ${session.agencyName ?? 'your agency'}`}
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Agency Users" value={agencyUsers.length} icon={Users} tone="info" />
            <StatTile label="Active Accounts" value={activeCount} icon={UserCheck} tone="success" />
            <StatTile label="Inactive Accounts" value={inactiveCount} icon={UserX} tone="neutral" />
            <StatTile label="Missions Handled" value={missionHistory.length} icon={History} tone="warning" />
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
      </div>
    </>
  )
}
