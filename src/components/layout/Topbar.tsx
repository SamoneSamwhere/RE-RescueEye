import { Menu } from 'lucide-react'
import type { AppUserSummary } from '../../types/user'
import type { AppNotification } from '../../types/notification'
import { UserBadge } from './UserBadge'
import { NotificationArea } from './NotificationArea'
import { useTheme } from '../../features/theme'
import { cn } from '../../lib/cn'

interface TopbarProps {
  user: AppUserSummary
  notifications?: AppNotification[]
  onMenuClick: () => void
}

export function Topbar({ user, notifications = [], onMenuClick }: TopbarProps) {
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

      <NotificationArea notifications={notifications} />
      <UserBadge user={user} />
    </header>
  )
}
