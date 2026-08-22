import { Outlet } from 'react-router-dom'
import { ThemeProvider, useTheme } from '../features/theme'

/**
 * Public pages get their own page-in fade via PublicLayout; authenticated role dashboards get
 * theirs via each role's persistent layout (wrapping only the routed content, not the sidebar
 * shell) — see app/layouts/. Keeping this transition out of the shared root means navigating
 * between dashboard pages never remounts (and re-fades) the whole screen.
 */
function ThemedRootLayout() {
  const { theme } = useTheme()

  return (
    <div data-theme={theme} className="min-h-screen overflow-x-clip bg-background text-foreground">
      <Outlet />
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
