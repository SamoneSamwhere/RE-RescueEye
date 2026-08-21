import { Outlet } from 'react-router-dom'
import { PageTransition } from '../components/layout/PageTransition'
import { ThemeProvider, useTheme } from '../features/theme'

function ThemedRootLayout() {
  const { theme } = useTheme()

  return (
    <div data-theme={theme} className="min-h-screen overflow-x-clip bg-background text-foreground">
      <PageTransition>
        <Outlet />
      </PageTransition>
    </div>
  )
}

/** Shared theme boundary for public pages and every authenticated role. */
export function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedRootLayout />
    </ThemeProvider>
  )
}
