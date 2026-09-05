import type { ReactNode } from 'react'
import { MobileTopBar } from './MobileTopBar'
import { MobileBottomNav } from './MobileBottomNav'
import { DashboardBackdrop } from './DashboardBackdrop'
import type { NavItem } from '../../../types/nav'
import type { AppNotification } from '../../../types/notification'

interface MobileShellProps {
  navItems: NavItem[]
  notifications?: AppNotification[]
  children: ReactNode
}

/**
 * App chrome for the Field Responder mobile experience — a sticky top bar
 * and bottom tab bar around a scrollable content column, capped to a
 * phone-like width so it reads as a distinct mobile app even in a desktop
 * browser. Deliberately not the desktop AppShell (sidebar + topbar) — the
 * two roles have different interaction models, not just different widths.
 */
export function MobileShell({ navItems, notifications = [], children }: MobileShellProps) {
  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden border-x border-border bg-background">
      <MobileTopBar notifications={notifications} />
      <main className="relative flex-1">
        <DashboardBackdrop />
        <div className="relative z-10 min-h-full">{children}</div>
      </main>
      <MobileBottomNav items={navItems} />
    </div>
  )
}
