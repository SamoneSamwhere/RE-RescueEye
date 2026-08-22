import { useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { AppShell } from '../../components/layout'
import { PageTransition } from '../../components/layout/PageTransition'
import { useAuth } from '../../features/auth'
import { COMMAND_STAFF_NAV_ITEMS, useCommandStaffData } from '../../features/command-staff'

const RECENT_NOTIFICATIONS_LIMIT = 5

/**
 * Persistent Command Staff shell — mounted once for the whole role, not per page, so the
 * sidebar/topbar never remount (and the scroll container never resets) when navigating between
 * Command Staff pages. Only the routed page content inside PageTransition swaps and fades.
 */
export function CommandStaffLayout() {
  const { session, logout } = useAuth()
  const { notifications: sharedNotifications } = useCommandStaffData()

  const notifications = useMemo(
    () =>
      [...sharedNotifications]
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt))
        .slice(0, RECENT_NOTIFICATIONS_LIMIT)
        .map((n) => ({ id: n.id, title: n.message, timestamp: n.sentAt, read: n.read, type: n.type })),
    [sharedNotifications],
  )

  if (!session) return null

  return (
    <AppShell
      user={{ name: session.name, role: session.role, agencyName: session.agencyName }}
      navItems={COMMAND_STAFF_NAV_ITEMS}
      notifications={notifications}
      onLogout={logout}
    >
      <PageTransition>
        <Outlet />
      </PageTransition>
    </AppShell>
  )
}
