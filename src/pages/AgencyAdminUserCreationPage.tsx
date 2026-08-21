import { AppShell, PageHeader } from '../components/layout'
import { UserCreateForm } from '../components/agency-admin'
import { useAuth } from '../features/auth'
import { AGENCY_ADMIN_NAV_ITEMS, useAgencyAdminData } from '../features/agency-admin'

export function AgencyAdminUserCreationPage() {
  const { session, logout } = useAuth()
  const { createUser } = useAgencyAdminData()

  if (!session) return null

  return (
    <AppShell
      user={{ name: session.name, role: session.role, agencyName: session.agencyName }}
      navItems={AGENCY_ADMIN_NAV_ITEMS}
      onLogout={logout}
    >
      <PageHeader
        title="User Creation"
        description="Create a Command Staff or Field Responder account for your agency."
      />

      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="max-w-md">
          <UserCreateForm onCreate={createUser} />
        </div>
      </div>
    </AppShell>
  )
}
