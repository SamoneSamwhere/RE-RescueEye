import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { HeroBackground } from './HeroBackground'
import { ThemeToggle } from './ThemeToggle'
import logo from '../../../assets/logo.png'

interface AuthPageShellProps {
  children: ReactNode
}

function AuthPageShellContent({ children }: AuthPageShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface-inverse">
      <HeroBackground />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-2 text-foreground-inverse">
          <span className="inline-flex size-8 items-center justify-center rounded-md bg-white/95 p-1 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
            <img src={logo} alt="" className="size-full object-contain" />
          </span>
          <span className="text-lg font-semibold tracking-tight">RescueEye</span>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-inverse/70 transition-colors hover:text-foreground-inverse"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Back to home</span>
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-6 pt-2 sm:px-6 sm:pt-4 lg:px-8 lg:pt-1">
        {children}
      </main>
    </div>
  )
}

/** Shared dark, animated backdrop for Login/Sign Up so they read as part of the same product as the landing page. */
export function AuthPageShell({ children }: AuthPageShellProps) {
  return <AuthPageShellContent>{children}</AuthPageShellContent>
}
