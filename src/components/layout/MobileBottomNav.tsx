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
        'sticky bottom-0 z-10 flex h-16 shrink-0 items-stretch border-t',
        isDark ? 'border-white/10 bg-surface-inverse' : 'border-border bg-surface',
      )}
    >
      {items.map((item) => {
        const Icon = item.icon
        const isActive = location.pathname === item.href
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
              isActive
                ? 'text-accent'
                : isDark
                  ? 'text-foreground-inverse/60 hover:text-foreground-inverse'
                  : 'text-foreground-muted hover:text-foreground-secondary',
            )}
          >
            {Icon ? <Icon className="size-5" /> : null}
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
