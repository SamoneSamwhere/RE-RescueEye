import { AppShell, PageHeader } from '../components/layout'
import { AgencyValidationList } from '../components/system-admin'
import { useAuth } from '../features/auth'
import { SYSTEM_ADMIN_NAV_ITEMS, useSystemAdminData } from '../features/system-admin'

export function SystemAdminAgencyValidationPage() {
  const { session, logout } = useAuth()
  const { agencies, approveAgency, rejectAgency, resubmitAgency } = useSystemAdminData()

  if (!session) return null

  const pendingAgencies = agencies
    .filter((a) => a.registrationStatus === 'PENDING')
    .sort((a, b) => a.registeredAt.localeCompare(b.registeredAt))
  const rejectedAgencies = agencies
    .filter((a) => a.registrationStatus === 'REJECTED')
    .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt))

  return (
    <AppShell
      user={{ name: session.name, role: session.role, agencyName: session.agencyName }}
      navItems={SYSTEM_ADMIN_NAV_ITEMS}
      onLogout={logout}
    >
      <PageHeader
        title="Agency Validation"
        description="Review pending agency registrations, and resubmit rejected ones for another pass."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <AgencyValidationList
          pendingAgencies={pendingAgencies}
          rejectedAgencies={rejectedAgencies}
          onApprove={approveAgency}
          onReject={rejectAgency}
          onResubmit={resubmitAgency}
        />
      </div>
    </AppShell>
  )
}
