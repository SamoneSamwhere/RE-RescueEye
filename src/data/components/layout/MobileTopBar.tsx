import { ShieldAlert } from 'lucide-react'
import { NotificationArea } from './NotificationArea'
import { ThemeToggle } from '../landing/ThemeToggle'
import type { AppNotification } from '../../../types/notification'
import { useTheme } from '../../../features/theme'
import { cn } from '../../../lib/cn'

interface MobileTopBarProps {
  notifications?: AppNotification[]
}

export function MobileTopBar({ notifications = [] }: MobileTopBarProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <header
      className={cn(
        'sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b px-4',
        isDark ? 'border-white/10 bg-surface-inverse' : 'border-border bg-surface',
      )}
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-5 text-accent" />
        <span className={cn('text-sm font-semibold tracking-tight', isDark ? 'text-foreground-inverse' : 'text-foreground')}>
          RescueEye
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle tone="adaptive" />
        <NotificationArea notifications={notifications} />
      </div>
    </header>
  )
}
