import { Menu } from 'lucide-react'
import type { AppUserSummary } from '../../types/user'
import type { AppNotification } from '../../types/notification'
import { UserMenu } from './UserMenu'
import { NotificationArea } from './NotificationArea'
import { ThemeToggle } from '../landing/ThemeToggle'
import { useTheme } from '../../features/theme'
import { cn } from '../../lib/cn'

interface TopbarProps {
  user: AppUserSummary
  notifications?: AppNotification[]
  onMenuClick: () => void
  onLogout?: () => void
}

export function Topbar({ user, notifications = [], onMenuClick, onLogout }: TopbarProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <header className={cn('flex h-14 shrink-0 items-center gap-3 border-b px-4', isDark ? 'border-white/10 bg-surface-inverse' : 'border-border bg-surface')}>
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open navigation"
        className={cn(
          'rounded-sm p-1.5 md:hidden',
          isDark
            ? 'text-foreground-inverse/70 hover:bg-white/10 hover:text-foreground-inverse'
            : 'text-foreground-secondary hover:bg-surface-secondary hover:text-foreground',
        )}
      >
        <Menu className="size-5" />
      </button>

      <div className="flex-1" />

      <ThemeToggle tone="adaptive" />
      <NotificationArea notifications={notifications} />
      <UserMenu user={user} onLogout={onLogout} />
    </header>
  )
}
