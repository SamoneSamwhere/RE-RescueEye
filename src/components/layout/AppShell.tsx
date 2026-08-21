import { useState } from 'react'
import type { ReactNode } from 'react'
import type { NavItem } from '../../types/nav'
import type { AppUserSummary } from '../../types/user'
import type { AppNotification } from '../../types/notification'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { DashboardBackdrop } from './DashboardBackdrop'

interface AppShellProps {
  navItems?: NavItem[]
  user: AppUserSummary
  notifications?: AppNotification[]
  onLogout?: () => void
  children: ReactNode
}

/**
 * Reusable role-agnostic shell: sidebar + top bar + main content area.
 * Role-specific navigation is passed in via `navItems`, not hardcoded here.
 */
export function AppShell({ navItems = [], user, notifications = [], onLogout, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar navItems={navItems} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          notifications={notifications}
          onMenuClick={() => setMobileNavOpen(true)}
          onLogout={onLogout}
        />
        {/* overflow-x-hidden keeps a wide table/grid from ever forcing the whole
            page to scroll sideways — each Table already scrolls internally. */}
        <main className="relative flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-background">
          <DashboardBackdrop />
          <div className="relative z-10 flex min-h-full flex-col">{children}</div>
        </main>
      </div>
    </div>
  )
}
