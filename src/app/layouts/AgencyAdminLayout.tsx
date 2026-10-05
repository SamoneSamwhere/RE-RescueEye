import { Outlet } from 'react-router-dom'
import { AppShell } from '../../components/layout'
import { PageTransition } from '../../components/layout/PageTransition'
import { useAuth } from '../../features/auth'
import { AGENCY_ADMIN_NAV_ITEMS } from '../../features/agency-admin'

/**
 * Persistent Agency Admin shell — mounted once for the whole role, not per page, so the
 * sidebar/topbar never remount when navigating between Agency Admin pages. Only the routed
 * page content inside PageTransition swaps and fades.
 */
export function AgencyAdminLayout() {
  const { session, logout } = useAuth()

  if (!session) return null

  return (
    <AppShell
      user={{ name: session.name, role: session.role, agencyName: session.agencyName }}
      navItems={AGENCY_ADMIN_NAV_ITEMS}
      onLogout={logout}
    >
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  )
}
