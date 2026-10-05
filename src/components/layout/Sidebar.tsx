import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { Menu, PanelLeftClose, ShieldAlert, X } from 'lucide-react'
import type { NavItem } from '../../../types/nav'
import { cn } from '../../../lib/cn'
import { useTheme } from '../../../features/theme'

interface SidebarProps {
  navItems: NavItem[]
  open: boolean
  onClose: () => void
}

const PINNED_STORAGE_KEY = 'rescueeye:sidebar-pinned'
/** Small hover-intent delays so a quick mouse pass-over doesn't jitter the sidebar open/closed,
 *  and so the per-icon tooltip gets a moment to show before the panel commits to expanding. */
const OPEN_INTENT_DELAY_MS = 150
const CLOSE_INTENT_DELAY_MS = 150

function readPinnedPreference(): boolean {
  try {
    return localStorage.getItem(PINNED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Desktop-first sidebar that becomes an off-canvas drawer below the md breakpoint.
 * At md+ it rests collapsed to an icon rail and expands on hover (or focus, for
 * keyboard users) with a short hover-intent delay; a pin toggle lets it stay
 * expanded permanently. Collapsed/expanded state only ever affects md+ — the
 * mobile drawer always shows full icons + labels while open.
 */
export function Sidebar({ navItems, open, onClose }: SidebarProps) {
  const location = useLocation()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [pinned, setPinned] = useState(readPinnedPreference)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current)
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [])

  const expanded = pinned || hovered || focused
  const showLabels = open || expanded

  const [tooltip, setTooltip] = useState<{ label: string; top: number; left: number } | null>(null)

  // Once the panel itself commits to expanding, the inline label already says
  // the same thing — drop the tooltip so they don't sit on screen together.
  useEffect(() => {
    if (showLabels) setTooltip(null)
  }, [showLabels])

  function showItemTooltip(target: HTMLElement, label: string) {
    if (showLabels) return
    const rect = target.getBoundingClientRect()
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 8 })
  }

  function hideItemTooltip() {
    setTooltip(null)
  }

  function handleNavClick() {
    setHovered(false)
    setFocused(false)
  }

  function handleMouseEnter() {
    if (pinned) return
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null 
    }
    if (hovered) return
    openTimer.current = setTimeout(() => setHovered(true), OPEN_INTENT_DELAY_MS)
  }

  function handleMouseLeave() {
    if (openTimer.current) {
      clearTimeout(openTimer.current)
      openTimer.current = null
    }
    closeTimer.current = setTimeout(() => setHovered(false), CLOSE_INTENT_DELAY_MS)
  }

  function togglePinned() {
    setPinned((prev) => {
      const next = !prev
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, next ? '1' : '0')
      } catch {
        // Best-effort only — pin state just won't survive a reload.
      }
      return next
    })
  }

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
        aria-expanded={expanded}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-hidden border-r transition-[width,transform] duration-200 ease-out',
          isDark ? 'border-white/10 bg-surface-inverse' : 'border-border bg-surface',
          'md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
          expanded ? 'md:w-64' : 'md:w-16',
        )}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-3',
            isDark ? 'border-white/10' : 'border-border',
          )}
        >
          <ShieldAlert className="size-5 shrink-0 text-accent" />
          <span
            className={cn(
              'whitespace-nowrap text-sm font-semibold tracking-tight transition-opacity duration-150',
              isDark ? 'text-foreground-inverse' : 'text-foreground',
              showLabels ? 'opacity-100' : 'opacity-0 md:hidden',
              expanded && !open && 'delay-100',
            )}
          >
            RescueEye
          </span>

          {/* Desktop pin toggle — only meaningful (and only has room) once expanded. */}
          <button
            type="button"
            onClick={togglePinned}
            aria-pressed={pinned}
            title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
            className={cn(
              'ml-auto hidden shrink-0 rounded-sm p-1.5 transition-opacity duration-150 md:inline-flex',
              expanded ? 'opacity-100 delay-100' : 'pointer-events-none opacity-0',
              isDark
                ? 'text-foreground-inverse/60 hover:bg-white/10 hover:text-foreground-inverse'
                : 'text-foreground-muted hover:bg-surface-secondary hover:text-foreground',
              pinned && (isDark ? 'bg-white/10 text-foreground-inverse' : 'bg-accent-subtle text-accent'),
            )}
          >
            {pinned ? <PanelLeftClose className="size-4" /> : <Menu className="size-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className={cn(
              'ml-auto rounded-sm p-1 md:hidden',
              isDark
                ? 'text-foreground-inverse/60 hover:bg-white/10 hover:text-foreground-inverse'
                : 'text-foreground-muted hover:bg-surface-secondary hover:text-foreground',
            )}
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-x-hidden overflow-y-auto px-2 py-3">
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
                      onClick={handleNavClick}
                      onMouseEnter={(event) => showItemTooltip(event.currentTarget, item.label)}
                      onMouseLeave={hideItemTooltip}
                      onFocus={(event) => showItemTooltip(event.currentTarget, item.label)}
                      onBlur={hideItemTooltip}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium motion-safe:transition-colors motion-safe:duration-150',
                        !showLabels && 'md:justify-center',
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
                      <span
                        className={cn(
                          'flex-1 truncate whitespace-nowrap transition-opacity duration-150',
                          showLabels ? 'opacity-100' : 'opacity-0 md:hidden',
                          expanded && !open && 'delay-100',
                        )}
                      >
                        {item.label}
                      </span>
                      {item.badge !== undefined && showLabels ? (
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

      {tooltip
        ? createPortal(
            <span
              role="tooltip"
              className={cn(
                'pointer-events-none fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium shadow-panel motion-safe:animate-fade-in',
                isDark
                  ? 'border-white/10 bg-surface-inverse text-foreground-inverse'
                  : 'border-border bg-surface text-foreground',
              )}
              style={{ top: tooltip.top, left: tooltip.left }}
            >
              {tooltip.label}
            </span>,
            document.body,
          )
        : null}
    </>
  )
}
