import { AppShell, PageHeader } from '../components/layout'
import { Panel } from '../components/ui'
import { AgencyStatusTable } from '../components/system-admin'
import { useAuth } from '../features/auth'
import { SYSTEM_ADMIN_NAV_ITEMS, useSystemAdminData } from '../features/system-admin'

export function SystemAdminAgencyStatusPage() {
  const { session, logout } = useAuth()
  const { agencies, setAgencyAccountStatus } = useSystemAdminData()

  if (!session) return null

  const approvedAgencies = agencies
    .filter((a) => a.registrationStatus === 'APPROVED')
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <AppShell
      user={{ name: session.name, role: session.role, agencyName: session.agencyName }}
      navItems={SYSTEM_ADMIN_NAV_ITEMS}
      onLogout={logout}
    >
      <PageHeader
        title="Agency Account Status Management"
        description="Activate or deactivate approved agencies. Deactivating never deletes the agency record."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <Panel title={`Approved Agencies (${approvedAgencies.length})`}>
          <AgencyStatusTable agencies={approvedAgencies} onSetStatus={setAgencyAccountStatus} />
        </Panel>
      </div>
    </AppShell>
  )
}
