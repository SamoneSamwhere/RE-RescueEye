import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut, Settings, User as UserIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { USER_ROLE_LABEL } from '../../../lib/labels'
import type { AppUserSummary } from '../../../types/user'
import { cn } from '../../../lib/cn'
import { useTheme } from '../../../features/theme'
import { useAuth } from '../../../features/auth'
import { ROUTES } from '../../../routes/paths'

interface UserMenuProps {
  user: AppUserSummary
  onLogout?: () => void
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const getSettingsRoute = () => {
    switch (session?.role) {
      case 'SYSTEM_ADMIN':
        return ROUTES.systemAdminSettings
      case 'AGENCY_ADMIN':
        return ROUTES.agencyAdminSettings
      case 'COMMAND_STAFF':
        return ROUTES.commandStaffSettings
      case 'FIELD_RESPONDER':
        return ROUTES.fieldResponderSettings
      default:
        return null
    }
  }

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5',
          isDark ? 'hover:bg-white/10' : 'hover:bg-surface-secondary',
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent">
          {initials || <UserIcon className="size-4" />}
        </span>
        <span className="hidden flex-col items-start sm:flex">
          <span className={cn('text-sm font-medium leading-tight', isDark ? 'text-foreground-inverse' : 'text-foreground')}>
            {user.name}
          </span>
          <span className={cn('text-xs leading-tight', isDark ? 'text-foreground-inverse/60' : 'text-foreground-muted')}>
            {USER_ROLE_LABEL[user.role]}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 transition-transform duration-200',
            isDark ? 'text-foreground-inverse/60' : 'text-foreground-muted',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-48 origin-top-right rounded-md border border-border bg-surface py-1 shadow-modal motion-safe:animate-pop-in"
        >
          <div className="border-b border-border px-2 py-2 sm:hidden">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-foreground-muted">{USER_ROLE_LABEL[user.role]}</p>
          </div>
          {user.agencyName ? (
            <p className="px-2 py-1.5 text-xs text-foreground-muted">{user.agencyName}</p>
          ) : null}
          {getSettingsRoute() ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                navigate(getSettingsRoute()!)
              }}
              className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-foreground-secondary hover:bg-surface-secondary hover:text-foreground"
            >
              <Settings className="size-4" />
              Settings
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onLogout?.()
            }}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-foreground-secondary hover:bg-surface-secondary hover:text-foreground"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      ) : null}
    </div>
  )
}
