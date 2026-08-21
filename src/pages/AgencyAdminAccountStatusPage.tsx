import { AppShell, PageHeader } from '../components/layout'
import { Panel } from '../components/ui'
import { UserStatusTable } from '../components/agency-admin'
import { useAuth } from '../features/auth'
import { AGENCY_ADMIN_NAV_ITEMS, useAgencyAdminData } from '../features/agency-admin'

export function AgencyAdminAccountStatusPage() {
  const { session, logout } = useAuth()
  const { agencyUsers, setUserStatus } = useAgencyAdminData()

  if (!session) return null

  return (
    <AppShell
      user={{ name: session.name, role: session.role, agencyName: session.agencyName }}
      navItems={AGENCY_ADMIN_NAV_ITEMS}
      onLogout={logout}
    >
      <PageHeader
        title="Account Status Management"
        description="Activate or deactivate your agency's Command Staff and Field Responder accounts."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Panel title={`Users (${agencyUsers.length})`}>
          <UserStatusTable users={agencyUsers} onSetStatus={setUserStatus} />
        </Panel>
      </div>
    </AppShell>
  )
}
