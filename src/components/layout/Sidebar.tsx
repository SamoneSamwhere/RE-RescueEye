import { Link, useLocation } from 'react-router-dom'
import { ShieldAlert, X } from 'lucide-react'
import type { NavItem } from '../../types/nav'
import { cn } from '../../lib/cn'
import { useTheme } from '../../features/theme'

interface SidebarProps {
  navItems: NavItem[]
  open: boolean
  onClose: () => void
}

/** Desktop-first sidebar that becomes an off-canvas drawer below the md breakpoint. */
export function Sidebar({ navItems, open, onClose }: SidebarProps) {
  const location = useLocation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-surface-inverse/40 motion-safe:animate-fade-in md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r transition-transform duration-200',
          isDark ? 'border-white/10 bg-surface-inverse' : 'border-border bg-surface',
          'md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className={cn('flex h-14 shrink-0 items-center justify-between border-b px-4', isDark ? 'border-white/10' : 'border-border')}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="size-5 text-accent" />
            <span className={cn('text-sm font-semibold tracking-tight', isDark ? 'text-foreground-inverse' : 'text-foreground')}>
              RescueEye
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className={cn(
              'rounded-sm p-1 md:hidden',
              isDark
                ? 'text-foreground-inverse/60 hover:bg-white/10 hover:text-foreground-inverse'
                : 'text-foreground-muted hover:bg-surface-secondary hover:text-foreground',
            )}
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {navItems.length === 0 ? (
            <p className="px-2 py-2 text-xs text-foreground-muted">No navigation items</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href

                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? isDark
                            ? 'bg-white/10 text-foreground-inverse'
                            : 'bg-accent-subtle text-accent'
                          : isDark
                            ? 'text-foreground-inverse/60 hover:bg-white/10 hover:text-foreground-inverse'
                            : 'text-foreground-secondary hover:bg-surface-secondary hover:text-foreground',
                      )}
                    >
                      {Icon ? <Icon className="size-4 shrink-0" /> : null}
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined ? (
                          <span
                            className={cn(
                              'rounded-full px-1.5 py-0.5 text-xs',
                              isDark
                                ? 'bg-white/10 text-foreground-inverse/70'
                                : 'bg-surface-secondary text-foreground-secondary',
                            )}
                          >
                          {item.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </nav>
      </aside>
    </>
  )
}
