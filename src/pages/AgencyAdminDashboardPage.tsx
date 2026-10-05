import { Link } from 'react-router-dom'
import { Activity, ArrowRight, UserCheck, UserX, UsersRound } from 'lucide-react'
import { PageHeader } from '../components/layout'
import { Card, Badge, Panel } from '../components/ui'
import { BarList, BreakdownBar, StatTile } from '../components/dashboard'
import { Reveal } from '../components/landing/Reveal'
import { useAuth } from '../features/auth'
import { useAgencyAdminData } from '../features/agency-admin'
import { formatDateTime } from '../lib/formatDateTime'
import { USER_ROLE_LABEL } from '../lib/labels'
import { ROUTES } from '../routes/paths'

/**
 * The Agency Admin manages accounts and monitors response teams. Account
 * status and role mix are what they act on; team activity is what they
 * watch — Command Staff form those teams when they alert responders. Drone
 * analytics (and a bare personnel total) were removed on purpose.
 */
export function AgencyAdminDashboardPage() {
  const { session } = useAuth()
  const { agencyUsers, responseTeams } = useAgencyAdminData()

  if (!session) return null

  const activeCount = agencyUsers.filter((u) => u.accountStatus === 'ACTIVE').length
  const inactiveCount = agencyUsers.length - activeCount
  const commandStaffCount = agencyUsers.filter((u) => u.role === 'COMMAND_STAFF').length
  const responderCount = agencyUsers.filter((u) => u.role === 'FIELD_RESPONDER').length

  const activeTeams = responseTeams.filter((t) => t.status === 'ACTIVE')
  const deployedCount = activeTeams.reduce((sum, t) => sum + t.members.length, 0)
  const activeTeamSizes = activeTeams
    .map((t) => ({ label: `Incident ${t.incidentId}`, value: t.members.length }))
    .sort((a, b) => b.value - a.value)

  const recentPersonnel = [...agencyUsers].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  return (
    <>
      <PageHeader title="Dashboard" description={`Administration for ${session.agencyName ?? 'your organization'}`} />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Reveal>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Active Accounts" value={activeCount} icon={UserCheck} tone="success" />
              <StatTile label="Inactive Accounts" value={inactiveCount} icon={UserX} tone="neutral" />
              <StatTile label="Active Response Teams" value={activeTeams.length} icon={UsersRound} tone="info" />
              <StatTile label="Responders Deployed" value={deployedCount} icon={Activity} tone="warning" />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="Staff by Role">
                <BreakdownBar
                  emptyLabel="No staff yet"
                  segments={[
                    { label: 'Field Responders', value: responderCount, tone: 'info' },
                    { label: 'Command Staff', value: commandStaffCount, tone: 'neutral' },
                  ]}
                />
              </Panel>
              <Panel title="Active Teams by Size">
                <BarList
                  items={activeTeamSizes}
                  unit="members"
                  emptyLabel="No active response teams — Command Staff form one when they alert responders."
                />
              </Panel>
            </div>
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
