import { Outlet } from 'react-router-dom'
import { AppShell } from '../../data/components/layout'
import { PageTransition } from '../../data/components/layout/PageTransition'
import { useAuth } from '../../features/auth'
import { SYSTEM_ADMIN_NAV_ITEMS } from '../../features/system-admin'

/**
 * Persistent System Admin shell — mounted once for the whole role, not per page, so the
 * sidebar/topbar never remount when navigating between System Admin pages. Only the routed
 * page content inside PageTransition swaps and fades.
 */
export function SystemAdminLayout() {
  const { session, logout } = useAuth()

  if (!session) return null

  return (
    <AppShell
      user={{ name: session.name, role: session.role, agencyName: session.agencyName }}
      navItems={SYSTEM_ADMIN_NAV_ITEMS}
      onLogout={logout}
    >
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  )
}
