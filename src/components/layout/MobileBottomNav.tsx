import { Link, useLocation } from 'react-router-dom'
import { cn } from '../../lib/cn'
import type { NavItem } from '../../types/nav'
import { useTheme } from '../../features/theme'

interface MobileBottomNavProps {
  items: NavItem[]
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const location = useLocation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <nav
      className={cn(
        'sticky bottom-0 z-10 flex shrink-0 items-stretch gap-1 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur',
        isDark ? 'border-white/10 bg-surface-inverse/95' : 'border-border bg-surface/95',
      )}
    >
      {items.map((item, index) => {
        const Icon = item.icon
        // A page under a tab keeps that tab lit; anything else under the role's
        // root (e.g. a mission or Settings) belongs to the first tab, Home.
        const matches = (href: string) => location.pathname === href || location.pathname.startsWith(`${href}/`)
        const isActive =
          index === 0
            ? location.pathname === item.href ||
              (matches(item.href) && !items.slice(1).some((other) => matches(other.href)))
            : matches(item.href)
        return (
          <Link
            key={item.href}
            to={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
              isActive
                ? 'text-accent'
                : isDark
                  ? 'text-foreground-inverse/60 hover:text-foreground-inverse'
                  : 'text-foreground-muted hover:text-foreground-secondary',
            )}
          >
            {Icon ? (
              <span
                className={cn(
                  'flex h-8 w-14 items-center justify-center rounded-full transition-colors',
                  isActive ? 'bg-accent/15' : 'group-hover:bg-surface-secondary/40',
                )}
              >
                <Icon className={cn('size-5 transition-transform', isActive && 'scale-110')} />
              </span>
            ) : null}
            <span className={cn(isActive && 'font-semibold')}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
