import { User as UserIcon } from 'lucide-react'
import { USER_ROLE_LABEL } from '../../lib/labels'
import type { AppUserSummary } from '../../types/user'
import { cn } from '../../lib/cn'
import { useTheme } from '../../features/theme'

/**
 * Who is signed in, shown in the top bar. Display only — Settings, the theme
 * switch and Log out live in the sidebar.
 */
export function UserBadge({ user }: { user: AppUserSummary }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent">
        {initials || <UserIcon className="size-4" />}
      </span>
      <span className="hidden flex-col items-start sm:flex">
        <span className={cn('text-sm font-medium leading-tight', isDark ? 'text-foreground-inverse' : 'text-foreground')}>
          {user.name}
        </span>
        <span className={cn('text-xs leading-tight', isDark ? 'text-foreground-inverse/60' : 'text-foreground-muted')}>
          {USER_ROLE_LABEL[user.role]}
          {user.agencyName ? ` · ${user.agencyName}` : ''}
        </span>
      </span>
    </div>
  )
}
