import { Moon, Sun } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { useTheme } from '../../features/theme'

interface ThemeToggleProps {
  className?: string
  tone?: 'dark' | 'adaptive'
}

/** Sun/moon toggle shared by public pages and authenticated dashboard chrome. */
export function ThemeToggle({ className, tone = 'dark' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const usesDarkSurface = tone === 'dark' || isDark

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      className={cn(
        'relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border transition-colors duration-200',
        usesDarkSurface
          ? 'border-white/15 bg-white/5 text-foreground-inverse hover:bg-white/10'
          : 'border-border-strong bg-surface text-foreground hover:bg-surface-secondary',
        className,
      )}
    >
      <Sun
        className={cn(
          'absolute size-4 transition-all duration-300 ease-out',
          isDark ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
        )}
      />
      <Moon
        className={cn(
          'absolute size-4 transition-all duration-300 ease-out',
          isDark ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0',
        )}
      />
    </button>
  )
}
